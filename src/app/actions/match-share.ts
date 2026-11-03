"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { newShareRow, shareTokenFor } from "@/lib/share/server";
import { notifyInApp } from "@/lib/notifications/notify";

const uuid = z.string().uuid();

export interface MatchShareStatus {
  /** Path of the share page (/m/<token>), only while the link is live for this pair. */
  path: string;
  ready: boolean;
  youConsented: boolean;
  theyConsented: boolean;
  expiresAt: string;
}

async function liveRow(me: string, other: string) {
  const [a, b] = me < other ? [me, other] : [other, me];
  const { data } = await createClient()
    .from("match_share_tokens")
    .select("id, user_a, user_b, user_a_consented, user_b_consented, expires_at")
    .eq("user_a", a)
    .eq("user_b", b)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

function toStatus(me: string, row: NonNullable<Awaited<ReturnType<typeof liveRow>>>): MatchShareStatus {
  const youAreA = row.user_a === me;
  const youConsented = youAreA ? row.user_a_consented : row.user_b_consented;
  const theyConsented = youAreA ? row.user_b_consented : row.user_a_consented;
  return {
    path: `/m/${shareTokenFor("match", row.id)}`,
    ready: youConsented && theyConsented,
    youConsented,
    theyConsented,
    expiresAt: row.expires_at,
  };
}

export async function getMatchShareStatus(candidateId: string): Promise<ActionResult<{ status: MatchShareStatus | null }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuid.safeParse(candidateId).success) return fail("That match isn't available.");
  const row = await liveRow(user.id, candidateId);
  return ok({ status: row ? toStatus(user.id, row) : null });
}

/** Turn on my side of the card. The link works for others only once both of us have. */
export async function consentMatchShare(candidateId: string): Promise<ActionResult<{ status: MatchShareStatus }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuid.safeParse(candidateId).success || candidateId === user.id) return fail("That match isn't available.");
  if (!(await rateLimit(`share:${user.id}`, LIMITS.shareLinksPerHour))) return fail("Too many share changes. Try again in a bit.");

  const fresh = newShareRow("match");
  const { data, error } = await createClient().rpc("consent_match_share", {
    p_other: candidateId,
    p_id: fresh.id,
    p_token_hash: fresh.tokenHash,
  });
  if (error) return fail(friendlyDbError(error.message));
  const result = data?.[0];
  const row = await liveRow(user.id, candidateId);
  if (!result || !row) return fail("Couldn't create the share card.");

  const status = toStatus(user.id, row);
  if (!status.theyConsented) {
    const { data: me } = await createAdminClient().from("profiles").select("first_name").eq("id", user.id).maybeSingle();
    await notifyInApp([
      {
        userId: candidateId,
        type: "share_request",
        actorId: user.id,
        entityId: row.id,
        title: `${me?.first_name ?? "Your match"} wants to share your match card`,
        body: "It shows only first names, your score and why you match. Nothing is shared until you turn it on too.",
        href: status.path,
      },
    ]);
  }
  revalidatePath(`/profile/${candidateId}`);
  return ok({ status });
}

/** Either student can revoke; the link 404s on the next request. */
export async function revokeMatchShare(candidateId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuid.safeParse(candidateId).success) return fail("That match isn't available.");
  if (!(await rateLimit(`share:${user.id}`, LIMITS.shareLinksPerHour))) return fail("Too many share changes. Try again in a bit.");
  const { error } = await createClient().rpc("revoke_match_share", { p_other: candidateId });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath(`/profile/${candidateId}`);
  return ok();
}
