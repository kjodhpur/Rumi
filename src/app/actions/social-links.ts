"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { notifyInApp } from "@/lib/notifications/notify";
import { cleanHandle, generateVerificationCode, isSocialPlatform, isValidHandle } from "@/lib/social/links";

const uuid = z.string().uuid();
const platformInput = z.string().refine(isSocialPlatform);

/**
 * Instagram / LinkedIn handles (Phase 7.2 c and 7.6). Shown as links only; Rumi never calls
 * either API. "Confirmed" means the student says they put the one-time code in their bio or
 * headline, so it's labeled self-attested everywhere. Handles never change the match score.
 */
export async function saveSocialLink(platform: string, rawHandle: string): Promise<ActionResult<{ verificationCode: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!platformInput.safeParse(platform).success || !isSocialPlatform(platform)) return fail("Pick Instagram or LinkedIn.");
  const handle = cleanHandle(platform, String(rawHandle ?? ""));
  if (!isValidHandle(platform, handle)) {
    return fail(platform === "instagram" ? "Use letters, numbers, dots or underscores (up to 30)." : "Use the part after linkedin.com/in/.");
  }
  if (!(await rateLimit(`social:${user.id}`, LIMITS.socialLinkChangesPerHour))) return fail("Too many changes. Try again in a bit.");

  const verificationCode = generateVerificationCode();
  const { error } = await createClient().from("social_links").upsert(
    { user_id: user.id, platform, handle, verification_code: verificationCode, verified_at: null, updated_at: new Date().toISOString() },
    { onConflict: "user_id,platform" },
  );
  if (error) return fail("Couldn't save that handle.");
  revalidatePath("/settings/accounts");
  return ok({ verificationCode });
}

export async function verifySocialLink(platform: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isSocialPlatform(platform)) return fail("Pick Instagram or LinkedIn.");
  if (!(await rateLimit(`social:${user.id}`, LIMITS.socialLinkChangesPerHour))) return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient()
    .from("social_links")
    .update({ verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("platform", platform);
  if (error) return fail("Couldn't save that. Try again.");
  revalidatePath("/settings/accounts");
  revalidatePath(`/profile/${user.id}`);
  return ok();
}

export async function removeSocialLink(platform: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isSocialPlatform(platform)) return fail("Pick Instagram or LinkedIn.");
  const { error } = await createClient().from("social_links").delete().eq("user_id", user.id).eq("platform", platform);
  if (error) return fail("Couldn't remove that handle.");
  revalidatePath("/settings/accounts");
  revalidatePath(`/profile/${user.id}`);
  return ok();
}

/** "We know each other": the other person has to confirm before it counts anywhere. */
export async function requestPeerConnection(targetUserId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(targetUserId).success || targetUserId === user.id) return fail("That person isn't available.");
  if (!(await rateLimit(`connection:${user.id}`, LIMITS.connectionRequestsPerDay))) return fail("You've sent a lot of requests today. Try again tomorrow.");

  const { data, error } = await createClient().rpc("request_connection", { p_target: targetUserId });
  if (error) return fail(friendlyDbError(error.message));
  if (data === "requested" || data === "confirmed") {
    const { data: me } = await createAdminClient().from("profiles").select("first_name").eq("id", user.id).maybeSingle();
    const name = me?.first_name ?? "Someone";
    await notifyInApp([
      data === "requested"
        ? { userId: targetUserId, type: "connection_request", actorId: user.id, title: `${name} says you know each other`, body: "Confirm it on their profile, or ignore it.", href: `/profile/${user.id}` }
        : { userId: targetUserId, type: "connection_confirmed", actorId: user.id, title: `You and ${name} are connected`, href: `/profile/${user.id}` },
    ]);
  }
  revalidatePath(`/profile/${targetUserId}`);
  return ok();
}

export async function respondPeerConnection(connectionId: string, accept: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(connectionId).success || typeof accept !== "boolean") return fail("That request isn't available.");
  if (!(await rateLimit(`connection:${user.id}`, LIMITS.connectionRequestsPerDay))) return fail("Too many changes today. Try again tomorrow.");

  const supabase = createClient();
  const { data: row } = await supabase.from("connections").select("user_a").eq("id", connectionId).maybeSingle();
  const { data, error } = await supabase.rpc("respond_connection", { p_id: connectionId, p_accept: accept });
  if (error) return fail(friendlyDbError(error.message));
  if (data === "confirmed" && row) {
    const { data: me } = await createAdminClient().from("profiles").select("first_name").eq("id", user.id).maybeSingle();
    await notifyInApp([
      { userId: row.user_a, type: "connection_confirmed", actorId: user.id, title: `${me?.first_name ?? "They"} confirmed you know each other`, href: `/profile/${user.id}` },
    ]);
  }
  if (row) revalidatePath(`/profile/${row.user_a}`);
  return ok();
}

export async function removePeerConnection(connectionId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(connectionId).success) return fail("That connection isn't available.");
  const { error } = await createClient()
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  if (error) return fail("Couldn't remove that connection.");
  revalidatePath("/matches");
  return ok();
}
