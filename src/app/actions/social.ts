"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { firstError, introSchema, reportSchema } from "@/lib/validation";
import { fileAutoReport, forwardToWebhook, moderateText } from "@/lib/moderation";
import { runInBackground } from "@/lib/background";
import { emailIntroAccepted, emailIntroReceived } from "@/lib/email/notify";

const uuid = z.string().uuid();

export async function toggleSave(targetId: string, save: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(targetId).success) return fail("Couldn't update saved.");
  const supabase = createClient();
  const { error } = save
    ? await supabase.from("saves").upsert({ user_id: user.id, target_id: targetId }, { onConflict: "user_id,target_id", ignoreDuplicates: true })
    : await supabase.from("saves").delete().eq("user_id", user.id).eq("target_id", targetId);
  if (error) return fail("Couldn't update saved. Try again.");
  return ok();
}

export async function sendIntro(input: { recipientId: string; message: string }): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = introSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  if (!(await rateLimit(`intro:${user.id}`, LIMITS.introsPerDay))) {
    return fail("You've sent a lot of intros today. Try again tomorrow.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_intro", {
    p_recipient: parsed.data.recipientId,
    p_message: parsed.data.message,
  });
  if (error || !data) return fail(friendlyDbError(error?.message));

  const flags = moderateText(parsed.data.message);
  runInBackground("intro-followups", async () => {
    await emailIntroReceived(data);
    if (flags.length) {
      await fileAutoReport({ reportedId: user.id, flags, excerpt: parsed.data.message, introId: data });
    }
  });
  revalidatePath("/messages");
  return ok({ id: data });
}

export async function respondToIntro(introId: string, accept: boolean): Promise<ActionResult<{ conversationId: string | null }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(introId).success) return fail("That intro is no longer available.");
  const supabase = createClient();

  if (!accept) {
    const { error } = await supabase.rpc("decline_intro", { p_intro_id: introId });
    if (error) return fail(friendlyDbError(error.message));
    revalidatePath("/messages");
    return ok({ conversationId: null });
  }

  const { data, error } = await supabase.rpc("accept_intro", { p_intro_id: introId });
  if (error || !data) return fail(friendlyDbError(error?.message));
  runInBackground("intro-accepted-email", () => emailIntroAccepted(introId));
  revalidatePath("/messages");
  return ok({ conversationId: data });
}

export async function withdrawIntro(introId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(introId).success) return fail("That intro is no longer available.");
  const { error } = await createClient().rpc("withdraw_intro", { p_intro_id: introId });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/messages");
  return ok();
}

export async function blockUser(targetId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(targetId).success || targetId === user.id) return fail("Couldn't block.");
  const supabase = createClient();
  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) return fail("Couldn't block. Try again.");
  // A block also quietly closes any pending intro between you.
  await createAdminClient()
    .from("intros")
    .update({ status: "withdrawn", responded_at: new Date().toISOString() })
    .eq("status", "pending")
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${user.id})`);
  revalidatePath("/matches");
  revalidatePath("/messages");
  return ok();
}

export async function unblockUser(targetId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(targetId).success) return fail("Couldn't unblock.");
  const { error } = await createClient().from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  if (error) return fail("Couldn't unblock. Try again.");
  revalidatePath("/settings");
  return ok();
}

export async function reportUser(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  if (parsed.data.reportedId === user.id) return fail("You can't report yourself.");
  if (!(await rateLimit(`report:${user.id}`, LIMITS.reportsPerDay))) {
    return fail("You've filed several reports today. Our team is on it.");
  }

  const supabase = createClient();
  // Attach the reported message itself (only if the reporter can see it).
  let excerpt: string | null = null;
  if (parsed.data.messageId) {
    const { data } = await supabase.from("messages").select("body, sender_id").eq("id", parsed.data.messageId).maybeSingle();
    if (data?.sender_id === parsed.data.reportedId) excerpt = data.body.slice(0, 500);
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_id: parsed.data.reportedId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      context: {
        message_id: parsed.data.messageId ?? null,
        conversation_id: parsed.data.conversationId ?? null,
        excerpt,
      },
    })
    .select("id")
    .single();
  if (error) return fail("Couldn't send your report. Try again.");
  runInBackground("report-webhook", () =>
    forwardToWebhook({ kind: "report", reportId: data.id, reason: parsed.data.reason }),
  );
  return ok();
}
