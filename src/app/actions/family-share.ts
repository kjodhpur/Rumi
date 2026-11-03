"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { generateRawShareToken, hashShareToken } from "@/lib/share/token";
import type { FamilyShareScope } from "@/lib/family/scope";

const uuidSchema = z.string().uuid();

export interface FamilyShareStatus {
  id: string;
  token: string;
  scope: FamilyShareScope;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export async function getFamilyShareStatus(): Promise<
  ActionResult<{ share: FamilyShareStatus | null }>
> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_shares")
    .select("*")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return ok({ share: null });

  return ok({
    share: {
      id: data.id,
      token: data.token,
      scope: (data.scope as FamilyShareScope) || {},
      expiresAt: data.expires_at,
      revokedAt: data.revoked_at,
      isActive: true,
    },
  });
}

export async function createFamilyShare(
  scope: FamilyShareScope = { include_agreement: true, include_photos: false },
): Promise<ActionResult<{ token: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const rawToken = generateRawShareToken();
  const tokenHash = hashShareToken(rawToken);

  // Default expiry: 90 days into future
  const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString();

  // Revoke any existing active shares first
  await supabase
    .from("family_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const { error } = await supabase.from("family_shares").insert({
    user_id: user.id,
    token: rawToken,
    token_hash: tokenHash,
    scope,
    expires_at: expiresAt,
  });

  if (error) return fail(error.message);

  revalidatePath("/settings/privacy");
  return ok({ token: rawToken });
}

export async function revokeFamilyShare(shareId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(shareId).success) return fail("Invalid share ID.");

  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("family_shares")
    .update({ revoked_at: now })
    .eq("id", shareId)
    .eq("user_id", user.id);

  if (error) return fail(error.message);

  revalidatePath("/settings/privacy");
  return ok();
}
