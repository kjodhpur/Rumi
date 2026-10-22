"use server";

import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";
import { firstError, messageSchema } from "@/lib/validation";
import { fileAutoReport, moderateText } from "@/lib/moderation";
import { runInBackground } from "@/lib/background";
import { emailNewMessage } from "@/lib/email/notify";
import { MESSAGE_PAGE, toChatMessage, type ChatMessage } from "@/lib/messages";

export async function sendMessage(input: {
  conversationId: string;
  body: string;
  clientId: string;
}): Promise<ActionResult<ChatMessage>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const [minute, day] = await Promise.all([
    rateLimit(`msg:min:${user.id}`, LIMITS.messagesPerMinute),
    rateLimit(`msg:day:${user.id}`, LIMITS.messagesPerDay),
  ]);
  if (!minute) return fail("You're sending messages very quickly. Take a breath and try again.");
  if (!day) return fail("You've hit today's message limit. Try again tomorrow.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      body: parsed.data.body,
      client_id: parsed.data.clientId,
    })
    .select("id, sender_id, kind, body, created_at, client_id")
    .single();

  if (error) {
    // A retried optimistic send that already landed.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("messages")
        .select("id, sender_id, kind, body, created_at, client_id")
        .eq("sender_id", user.id)
        .eq("client_id", parsed.data.clientId)
        .maybeSingle();
      if (existing) return ok(toChatMessage(existing));
    }
    if (error.code === "42501") return fail("You can't reply to this conversation.");
    console.error("[messages] insert failed", error);
    return fail("Message didn't send. Tap to retry.");
  }

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id);

  const flags = moderateText(parsed.data.body);
  runInBackground("message-followups", async () => {
    await emailNewMessage(parsed.data.conversationId, user.id, parsed.data.body);
    if (flags.length) {
      await fileAutoReport({
        reportedId: user.id,
        flags,
        excerpt: parsed.data.body,
        conversationId: parsed.data.conversationId,
        messageId: data.id,
      });
    }
  });

  return ok(toChatMessage(data));
}

export async function markRead(conversationId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user || !z.string().uuid().safeParse(conversationId).success) return fail("Couldn't update.");
  const supabase = createClient();
  await Promise.all([
    supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId }),
    supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", user.id),
  ]);
  return ok();
}

export async function loadOlderMessages(conversationId: string, before: string): Promise<ActionResult<{ messages: ChatMessage[]; hasMore: boolean }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!z.string().uuid().safeParse(conversationId).success || Number.isNaN(Date.parse(before))) {
    return fail("Couldn't load messages.");
  }
  const { data, error } = await createClient()
    .from("messages")
    .select("id, sender_id, kind, body, created_at, client_id")
    .eq("conversation_id", conversationId)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE);
  if (error) return fail("Couldn't load messages.");
  return ok({ messages: (data ?? []).reverse().map(toChatMessage), hasMore: (data ?? []).length === MESSAGE_PAGE });
}
