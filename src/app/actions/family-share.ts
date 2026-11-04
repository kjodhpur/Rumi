"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { familyLinkExpiry, parseScope } from "@/lib/family/scope";
import { newShareRow, shareTokenFor } from "@/lib/share/server";

export interface FamilyShareStatus {
  id: string;
  path: string;
  includeAgreement: boolean;
  expiresAt: string;
}

export async function getFamilyShareStatus(): Promise<
  ActionResult<{ share: FamilyShareStatus | null }>
> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  const { data, error } = await createClient()
    .from("family_shares")
    .select("id, scope, expires_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) return fail("Couldn't load your family link.");
  return ok({
    share: data
      ? {
          id: data.id,
          path: `/parent/${shareTokenFor("family", data.id)}`,
          includeAgreement: parseScope(data.scope).include_agreement,
          expiresAt: data.expires_at,
        }
      : null,
  });
}

/** A new link replaces the old one, which stops working at once. */
export async function createFamilyShare(input: {
  includeAgreement: boolean;
}): Promise<ActionResult<{ share: FamilyShareStatus }>> {
  if (typeof input?.includeAgreement !== "boolean") return fail("Choose what to include.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`family:${user.id}`, LIMITS.familyLinksPerHour)))
    return fail("Too many new links. Try again in a bit.");

  const supabase = createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("school_id, is_staff")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.is_staff) return fail("Only students can share a family link.");
  const today = new Date().toISOString().slice(0, 10);
  const { data: nextTerm } = await supabase
    .from("terms")
    .select("starts_on")
    .eq("school_id", me.school_id)
    .gt("starts_on", today)
    .order("starts_on")
    .limit(1)
    .maybeSingle();

  await supabase
    .from("family_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  const fresh = newShareRow("family");
  const expiresAt = familyLinkExpiry(new Date(), nextTerm?.starts_on ?? null).toISOString();
  const { error } = await supabase.from("family_shares").insert({
    id: fresh.id,
    user_id: user.id,
    token_hash: fresh.tokenHash,
    scope: { include_agreement: input.includeAgreement },
    expires_at: expiresAt,
  });
  if (error) return fail("Couldn't create the link.");
  revalidatePath("/settings/privacy");
  return ok({
    share: {
      id: fresh.id,
      path: `/parent/${fresh.token}`,
      includeAgreement: input.includeAgreement,
      expiresAt,
    },
  });
}

export async function revokeFamilyShare(shareId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(shareId).success) return fail("That link isn't available.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  const { error } = await createClient()
    .from("family_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if (error) return fail("Couldn't turn off the link.");
  revalidatePath("/settings/privacy");
  return ok();
}
