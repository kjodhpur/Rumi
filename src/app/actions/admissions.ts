"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { hashPersonalEmail, normalizeEmail, parseAllowlist } from "@/lib/admissions/allowlist";
import { logAudit } from "@/lib/staff/audit";
import { assertRole } from "@/lib/staff/context";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

const schoolId = z.string().regex(/^[a-z0-9-]{2,40}$/);
const uuid = z.string().uuid();

async function admin(school: string) {
  const actorId = await assertRole(school, "configureSchool");
  if (!actorId) return null;
  if (!(await rateLimit(`staff-imports:${actorId}`, LIMITS.staffImportsPerHour)))
    return "limited" as const;
  return actorId;
}
const deny = (a: string | null) =>
  fail(
    a === "limited" ? "Too many changes. Try again in a bit." : "Only housing admins can do that.",
  );

const uploadInput = z.object({
  schoolId,
  content: z.string().max(2_000_000),
  termId: uuid.nullable(),
});

/** Adds admitted students' personal emails (hashed here, never stored) to the allowlist (3.1). */
export async function uploadAdmitAllowlist(
  raw: z.input<typeof uploadInput>,
): Promise<
  ActionResult<{ added: number; alreadyListed: number; invalidRows: number[]; duplicates: number }>
> {
  const parsed = uploadInput.safeParse(raw);
  if (!parsed.success) return fail("Choose a CSV file under 2 MB.");
  const actorId = await admin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  const [{ data: school }, { data: term }] = await Promise.all([
    db
      .from("schools")
      .select("email_domains, pre_arrival_enabled")
      .eq("id", parsed.data.schoolId)
      .maybeSingle(),
    parsed.data.termId
      ? db
          .from("terms")
          .select("id")
          .eq("id", parsed.data.termId)
          .eq("school_id", parsed.data.schoolId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!school) return fail("That school isn't available.");
  if (parsed.data.termId && !term) return fail("Pick one of your terms.");

  const list = parseAllowlist(parsed.data.content, school.email_domains ?? []);
  if (!list.hashes.length)
    return fail(
      list.invalidRows.length
        ? "No personal emails found. School emails sign in with the school account instead."
        : "The file is empty.",
    );

  const { data: existing } = await db
    .from("admit_allowlist")
    .select("email_hash")
    .eq("school_id", parsed.data.schoolId)
    .in("email_hash", list.hashes);
  const known = new Set((existing ?? []).map((r) => r.email_hash));
  const fresh = list.hashes.filter((h) => !known.has(h));
  for (let i = 0; i < fresh.length; i += 1000) {
    const { error } = await db
      .from("admit_allowlist")
      .insert(
        fresh
          .slice(i, i + 1000)
          .map((email_hash) => ({
            school_id: parsed.data.schoolId,
            email_hash,
            term_id: parsed.data.termId,
            created_by: actorId,
          })),
      );
    if (error) return fail("Couldn't save the list. Nothing after row " + i + " was added.");
  }
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "admit_allowlist_uploaded",
    entity: "admit_allowlist",
    meta: {
      added: fresh.length,
      alreadyListed: known.size,
      invalid: list.invalidRows.length,
      termId: parsed.data.termId,
    },
  });
  revalidatePath("/staff/settings/admissions");
  return ok({
    added: fresh.length,
    alreadyListed: known.size,
    invalidRows: list.invalidRows.slice(0, 50),
    duplicates: list.duplicates,
  });
}

const emailInput = z.object({ schoolId, email: z.string().max(254) });

/** Withdraws an admit: they can't sign up, and an existing pre-arrival profile is hidden. */
export async function withdrawAdmit(
  raw: z.input<typeof emailInput>,
): Promise<ActionResult<{ hadAccount: boolean }>> {
  const parsed = emailInput.safeParse(raw);
  if (!parsed.success) return fail("Enter the personal email they were admitted with.");
  const actorId = await admin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { data, error } = await createAdminClient()
    .from("admit_allowlist")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("school_id", parsed.data.schoolId)
    .eq("email_hash", hashPersonalEmail(parsed.data.email))
    .is("withdrawn_at", null)
    .select("id, used_by")
    .maybeSingle();
  if (error) return fail("Couldn't withdraw. Try again.");
  if (!data) return fail("That email isn't on the list, or was already withdrawn.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "admit_withdrawn",
    entity: "admit_allowlist",
    entityId: data.id,
    meta: { hadAccount: Boolean(data.used_by) },
  });
  revalidatePath("/staff/settings/admissions");
  return ok({ hadAccount: Boolean(data.used_by) });
}

/** Turns pre-arrival sign-up on or off for the school. */
export async function setPreArrivalEnabled(
  school: string,
  enabled: boolean,
): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || typeof enabled !== "boolean")
    return fail("Couldn't save.");
  const actorId = await admin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { error } = await createAdminClient()
    .from("schools")
    .update({ pre_arrival_enabled: enabled })
    .eq("id", school);
  if (error) return fail("Couldn't save.");
  await logAudit({
    actorId,
    schoolId: school,
    action: enabled ? "pre_arrival_enabled" : "pre_arrival_disabled",
    entity: "school",
    entityId: school,
  });
  revalidatePath("/staff/settings/admissions");
  return ok();
}

const linkInput = z.object({
  schoolId,
  personalEmail: z.string().max(254),
  schoolEmail: z.string().max(254),
});

/**
 * Staff-confirmed link for a student who made a second account with their school email.
 * The pre-arrival account keeps its matches, chats and groups and takes over the school
 * email; the empty duplicate is deleted. Refused if the duplicate has any activity.
 */
export async function linkAdmitAccount(raw: z.input<typeof linkInput>): Promise<ActionResult> {
  const parsed = linkInput.safeParse(raw);
  if (!parsed.success) return fail("Enter both emails.");
  const actorId = await admin(parsed.data.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const school = parsed.data.schoolId;
  const schoolEmail = normalizeEmail(parsed.data.schoolEmail);
  const db = createAdminClient();

  const [{ data: admit }, { data: schoolFor }] = await Promise.all([
    db
      .from("admit_allowlist")
      .select("used_by")
      .eq("school_id", school)
      .eq("email_hash", hashPersonalEmail(parsed.data.personalEmail))
      .is("withdrawn_at", null)
      .maybeSingle(),
    db.rpc("school_for_email", { p_email: schoolEmail }),
  ]);
  if (!admit?.used_by) return fail("No pre-arrival account uses that personal email.");
  if (schoolFor !== school) return fail("The second email has to be a school email.");
  const { data: dup } = await db
    .from("user_settings")
    .select("user_id")
    .eq("email", schoolEmail)
    .maybeSingle();
  if (dup?.user_id === admit.used_by) return fail("Those are already the same account.");

  if (dup) {
    const [{ count: chats }, { count: groups }, { count: intros }] = await Promise.all([
      db
        .from("conversation_members")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", dup.user_id),
      db
        .from("group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", dup.user_id),
      db
        .from("intros")
        .select("id", { count: "exact", head: true })
        .or(`sender_id.eq.${dup.user_id},recipient_id.eq.${dup.user_id}`),
    ]);
    if ((chats ?? 0) + (groups ?? 0) + (intros ?? 0) > 0)
      return fail(
        "The school-email account already has chats, intros or a group. Ask the student which account to keep and delete the other from Settings.",
      );
    const { error } = await db.auth.admin.deleteUser(dup.user_id);
    if (error) return fail("Couldn't remove the duplicate account.");
  }
  const { error } = await db.auth.admin.updateUserById(admit.used_by, {
    email: schoolEmail,
    email_confirm: true,
  });
  if (error) return fail("Couldn't move the school email to the pre-arrival account.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "admit_account_linked",
    entity: "profile",
    entityId: admit.used_by,
    meta: { removedDuplicate: Boolean(dup) },
  });
  revalidatePath("/staff/settings/admissions");
  return ok();
}

/**
 * A pre-arrival student adds their school email to the same account. Supabase sends a
 * confirmation to the new address; confirming clears pre-arrival (database trigger).
 */
export async function linkSchoolEmail(rawEmail: string): Promise<ActionResult<{ email: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return fail("Enter your school email.");
  if (!(await rateLimit(`link-email:${user.id}`, LIMITS.otpPerEmail)))
    return fail("Too many tries. Wait a few minutes.");
  const supabase = createClient();
  const [{ data: profile }, { data: school }] = await Promise.all([
    supabase.from("profiles").select("school_id, pre_arrival").eq("id", user.id).maybeSingle(),
    supabase.rpc("school_for_email", { p_email: parsed.data }),
  ]);
  if (!profile?.pre_arrival) return fail("Your account already uses your school email.");
  if (school !== profile.school_id) return fail("Use the email your school gave you.");
  const { error } = await supabase.auth.updateUser({ email: parsed.data });
  if (error)
    return fail(
      /already/i.test(error.message)
        ? "That school email already has an account. Ask your housing office to link them."
        : "Couldn't send the confirmation. Try again.",
    );
  return ok({ email: parsed.data });
}
