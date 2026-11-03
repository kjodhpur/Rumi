"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import {
  calculateTokenExpiry,
  generateRawShareToken,
  hashShareToken,
} from "@/lib/share/token";

const uuidSchema = z.string().uuid();

export interface MatchShareStatus {
  id: string;
  token: string;
  userAConsented: boolean;
  userBConsented: boolean;
  isReady: boolean;
  isCallerConsented: boolean;
  isCandidateConsented: boolean;
  revokedAt: string | null;
  expiresAt: string;
}

export async function getMatchShareStatus(
  candidateId: string,
): Promise<ActionResult<{ status: MatchShareStatus | null }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(candidateId).success) return fail("Invalid candidate ID.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("match_share_tokens")
    .select("*")
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${candidateId}),and(user_a.eq.${candidateId},user_b.eq.${user.id})`,
    )
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return ok({ status: null });

  const isUserA = data.user_a === user.id;
  const isCallerConsented = isUserA ? data.user_a_consented : data.user_b_consented;
  const isCandidateConsented = isUserA ? data.user_b_consented : data.user_a_consented;
  const isReady = data.user_a_consented && data.user_b_consented;

  return ok({
    status: {
      id: data.id,
      token: data.token,
      userAConsented: data.user_a_consented,
      userBConsented: data.user_b_consented,
      isReady,
      isCallerConsented,
      isCandidateConsented,
      revokedAt: data.revoked_at,
      expiresAt: data.expires_at,
    },
  });
}

export async function createOrConsentMatchShare(
  candidateId: string,
): Promise<ActionResult<{ token: string; isReady: boolean }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(candidateId).success) return fail("Invalid candidate ID.");
  if (user.id === candidateId) return fail("Cannot share a match with yourself.");

  const supabase = createClient();

  // Check for active token
  const { data: existing } = await supabase
    .from("match_share_tokens")
    .select("*")
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${candidateId}),and(user_a.eq.${candidateId},user_b.eq.${user.id})`,
    )
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const isUserA = existing.user_a === user.id;
    const updatePayload = isUserA
      ? { user_a_consented: true }
      : { user_b_consented: true };

    const { error: updateError } = await supabase
      .from("match_share_tokens")
      .update(updatePayload)
      .eq("id", existing.id);

    if (updateError) return fail(updateError.message);

    const isReady = isUserA
      ? existing.user_b_consented
      : existing.user_a_consented;

    revalidatePath(`/profile/${candidateId}`);
    return ok({ token: existing.token, isReady });
  }

  // Create fresh token
  const rawToken = generateRawShareToken();
  const tokenHash = hashShareToken(rawToken);
  const expiresAt = calculateTokenExpiry().toISOString();

  const { error: insertError } = await supabase.from("match_share_tokens").insert({
    user_a: user.id,
    user_b: candidateId,
    token: rawToken,
    token_hash: tokenHash,
    user_a_consented: true,
    user_b_consented: false,
    expires_at: expiresAt,
  });

  if (insertError) return fail(insertError.message);

  revalidatePath(`/profile/${candidateId}`);
  return ok({ token: rawToken, isReady: false });
}

export async function revokeMatchShare(
  candidateId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(candidateId).success) return fail("Invalid candidate ID.");

  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("match_share_tokens")
    .update({ revoked_at: now })
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${candidateId}),and(user_a.eq.${candidateId},user_b.eq.${user.id})`,
    )
    .is("revoked_at", null);

  if (error) return fail(error.message);

  revalidatePath(`/profile/${candidateId}`);
  return ok();
}
