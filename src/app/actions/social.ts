"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "@/lib/validations";
import {
  MAX_NEW_CONVERSATIONS_PER_DAY,
  FIRST_MESSAGE_MIN_CHARS,
} from "@/lib/constants";
import { messageSchema, replySchema } from "@/lib/validations";
import { trackEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function saveProfile(savedId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("saved_profiles").upsert({ user_id: user.id, saved_id: savedId });
  revalidatePath("/saved");
  return { ok: true };
}

export async function unsaveProfile(savedId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("saved_profiles")
    .delete()
    .eq("user_id", user.id)
    .eq("saved_id", savedId);
  revalidatePath("/saved");
  return { ok: true };
}

export async function hideProfile(hiddenId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("hidden_profiles").upsert({ user_id: user.id, hidden_id: hiddenId });
  await supabase
    .from("match_cache")
    .delete()
    .eq("user_id", user.id)
    .eq("other_id", hiddenId);
  revalidatePath("/matches");
  return { ok: true };
}

export async function blockUser(blockedId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: blockedId });
  await supabase
    .from("match_cache")
    .delete()
    .or(
      `and(user_id.eq.${user.id},other_id.eq.${blockedId}),and(user_id.eq.${blockedId},other_id.eq.${user.id})`,
    );
  revalidatePath("/matches");
  revalidatePath("/messages");
  return { ok: true };
}

export async function reportUser(input: unknown) {
  const data = reportSchema.parse(input);
  const { supabase, user } = await requireUser();
  await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: data.reportedId,
    reason: data.reason,
    details: data.details ?? null,
  });
  return { ok: true };
}

export async function startConversation(input: unknown) {
  const data = messageSchema.parse(input);
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`msg-start:${user.id}`, MAX_NEW_CONVERSATIONS_PER_DAY, 24 * 60 * 60_000);
  if (!limit.ok) {
    return { error: `You can start at most ${MAX_NEW_CONVERSATIONS_PER_DAY} conversations per day.` };
  }

  if (data.body.trim().length < FIRST_MESSAGE_MIN_CHARS) {
    return { error: `First message must be at least ${FIRST_MESSAGE_MIN_CHARS} characters.` };
  }

  // Existing conversation?
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);
  const myIds = (myParts ?? []).map((p) => p.conversation_id);
  if (myIds.length) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", data.recipientId)
      .in("conversation_id", myIds);
    if (shared?.[0]) {
      await supabase.from("messages").insert({
        conversation_id: shared[0].conversation_id,
        sender_id: user.id,
        body: data.body.trim(),
      });
      return { conversationId: shared[0].conversation_id };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: starts } = await supabase
    .from("conversation_starts")
    .select("count")
    .eq("user_id", user.id)
    .eq("day", today)
    .maybeSingle();
  if ((starts?.count ?? 0) >= MAX_NEW_CONVERSATIONS_PER_DAY) {
    return { error: `You can start at most ${MAX_NEW_CONVERSATIONS_PER_DAY} conversations per day.` };
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error || !conv) return { error: error?.message ?? "Could not create conversation" };

  await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: data.recipientId },
  ]);
  await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_id: user.id,
    body: data.body.trim(),
  });
  await supabase.from("conversation_starts").upsert({
    user_id: user.id,
    day: today,
    count: (starts?.count ?? 0) + 1,
  });
  await trackEvent("conversation_started", user.id, { other: data.recipientId });
  revalidatePath("/messages");
  return { conversationId: conv.id };
}

export async function sendReply(input: unknown) {
  const data = replySchema.parse(input);
  const { supabase, user } = await requireUser();
  const limit = rateLimit(`msg-reply:${user.id}`, 60, 60_000);
  if (!limit.ok) return { error: "Slow down — too many messages." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: data.conversationId,
    sender_id: user.id,
    body: data.body.trim(),
  });
  if (error) return { error: error.message };

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.conversationId);

  revalidatePath(`/messages/${data.conversationId}`);
  return { ok: true };
}

export async function markConversationRead(conversationId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  revalidatePath("/messages");
  return { ok: true };
}
