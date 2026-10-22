"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FIRST_MESSAGE_MIN_CHARS, MAX_NEW_CONVERSATIONS_PER_DAY } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/analytics";
import { z } from "zod";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const sendIntroSchema = z.object({
  toUserId: z.string().uuid(),
  message: z.string().min(FIRST_MESSAGE_MIN_CHARS).max(500),
});

export async function sendIntro(input: unknown) {
  const data = sendIntroSchema.parse(input);
  const { supabase, user } = await requireUser();

  if (data.toUserId === user.id) return { error: "You cannot intro yourself." };

  const limit = rateLimit(`intro:${user.id}`, MAX_NEW_CONVERSATIONS_PER_DAY, 24 * 60 * 60_000);
  if (!limit.ok) {
    return { error: `You can send at most ${MAX_NEW_CONVERSATIONS_PER_DAY} intros per day.` };
  }

  const { data: existing } = await supabase
    .from("intros")
    .select("id, status")
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${data.toUserId}),and(from_user_id.eq.${data.toUserId},to_user_id.eq.${user.id})`,
    )
    .in("status", ["pending", "accepted"]);

  if (existing?.some((i) => i.status === "accepted")) {
    return { error: "You already have an accepted intro with this person." };
  }
  if (existing?.some((i) => i.status === "pending")) {
    return { error: "There's already a pending intro with this person." };
  }

  const { data: intro, error } = await supabase
    .from("intros")
    .insert({
      from_user_id: user.id,
      to_user_id: data.toUserId,
      message: data.message.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !intro) return { error: error?.message ?? "Could not send intro" };

  await supabase.from("notifications").insert({
    user_id: data.toUserId,
    type: "intro_received",
    title: "New intro",
    body: data.message.trim().slice(0, 120),
    href: "/intros",
    meta: { intro_id: intro.id, from: user.id },
  });

  await trackEvent("intro_sent", user.id, { to: data.toUserId });
  revalidatePath("/intros");
  revalidatePath(`/profile/${data.toUserId}`);
  return { introId: intro.id };
}

export async function respondToIntro(introId: string, action: "accepted" | "declined") {
  const { supabase, user } = await requireUser();

  const { data: intro } = await supabase
    .from("intros")
    .select("*")
    .eq("id", introId)
    .maybeSingle();

  if (!intro || intro.to_user_id !== user.id) return { error: "Intro not found." };
  if (intro.status !== "pending") return { error: "Intro already resolved." };

  const { error } = await supabase
    .from("intros")
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq("id", introId);

  if (error) return { error: error.message };

  if (action === "accepted") {
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ intro_id: introId })
      .select("id")
      .single();

    if (conv) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: intro.from_user_id },
        { conversation_id: conv.id, user_id: intro.to_user_id },
      ]);
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: intro.from_user_id,
        body: intro.message,
      });
    }

    await supabase.from("notifications").insert({
      user_id: intro.from_user_id,
      type: "intro_accepted",
      title: "Intro accepted",
      body: "You can start chatting now.",
      href: conv ? `/messages/${conv.id}` : "/messages",
      meta: { intro_id: introId },
    });

    revalidatePath("/messages");
  }

  revalidatePath("/intros");
  return { ok: true, conversationId: action === "accepted" ? undefined : undefined };
}

export async function withdrawIntro(introId: string) {
  const { supabase, user } = await requireUser();
  const { data: intro } = await supabase.from("intros").select("*").eq("id", introId).maybeSingle();
  if (!intro || intro.from_user_id !== user.id) return { error: "Intro not found." };
  if (intro.status !== "pending") return { error: "Only pending intros can be withdrawn." };

  await supabase
    .from("intros")
    .update({ status: "withdrawn", responded_at: new Date().toISOString() })
    .eq("id", introId);

  revalidatePath("/intros");
  return { ok: true };
}
