"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const schoolId = z.string().regex(/^[a-z0-9-]{2,40}$/);

/** Code sign-in as a fallback next to single sign-on. Only takes effect once SSO is set up. */
export async function setOtpFallback(school: string, enabled: boolean): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || typeof enabled !== "boolean")
    return fail("Couldn't save.");
  const actorId = await assertRole(school, "configureSchool");
  if (!actorId) return fail("Only housing admins can change sign-in.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const db = createAdminClient();
  const { data: row } = await db
    .from("schools")
    .select("sso_provider_id")
    .eq("id", school)
    .maybeSingle();
  if (!enabled && !row?.sso_provider_id)
    return fail("Set up single sign-on before turning codes off, or nobody could sign in.");
  const { error } = await db.from("schools").update({ otp_enabled: enabled }).eq("id", school);
  if (error) return fail("Couldn't save.");
  await logAudit({
    actorId,
    schoolId: school,
    action: enabled ? "otp_fallback_enabled" : "otp_fallback_disabled",
    entity: "school",
    entityId: school,
  });
  revalidatePath("/staff/settings/sso");
  return ok();
}

const providerInput = z.object({
  schoolId,
  provider: z.enum(["saml", "oidc"]),
  providerId: z.string().uuid("Paste the provider ID from `supabase sso list`.").nullable(),
  domain: z
    .string()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Use a domain like asu.edu.")
    .nullable(),
});

/**
 * Connects the school to a Supabase Auth SSO provider. Registering the identity provider
 * (metadata, domains, attribute mapping) happens in Supabase; only the Rumi team links it.
 */
export async function saveSsoProvider(raw: z.input<typeof providerInput>): Promise<ActionResult> {
  const parsed = providerInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const db = createAdminClient();
  const { data: admin } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) return fail("Only the Rumi team can link an identity provider.");
  const p = parsed.data;
  const { error } = await db
    .from("schools")
    .update({
      sso_provider: p.providerId ? p.provider : null,
      sso_provider_id: p.providerId,
      sso_domain: p.domain,
      ...(p.providerId ? {} : { otp_enabled: true }),
    })
    .eq("id", p.schoolId);
  if (error) return fail("Couldn't save the provider.");
  await logAudit({
    actorId: user.id,
    schoolId: p.schoolId,
    action: p.providerId ? "sso_provider_linked" : "sso_provider_removed",
    entity: "school",
    entityId: p.schoolId,
    meta: { provider: p.provider, domain: p.domain },
  });
  revalidatePath("/staff/settings/sso");
  return ok();
}
