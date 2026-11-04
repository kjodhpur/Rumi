"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { CONSENT_VERSION, isConsentKind } from "@/lib/consent";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";

export async function setConsent(
  kind: string,
  granted: boolean,
): Promise<ActionResult<{ granted: boolean }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isConsentKind(kind) || typeof granted !== "boolean") return fail("Unknown setting.");
  if (!(await rateLimit(`consent:${user.id}`, LIMITS.consentChangesPerHour))) {
    return fail("Too many changes. Try again in a bit.");
  }
  const { data, error } = await createClient().rpc("set_consent", {
    p_kind: kind,
    p_granted: granted,
    p_version: CONSENT_VERSION,
  });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/settings/privacy");
  return ok({ granted: data === true });
}
