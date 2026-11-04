"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole, getStaffContext, STAFF_SCHOOL_COOKIE } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { hashToken, inviteExpiry, newInviteToken } from "@/lib/staff/tokens";
import { ROLE_INFO, STAFF_ROLES, type StaffRole } from "@/lib/staff/roles";
import { RETENTION_COPY, RETENTION_ENTITIES } from "@/lib/retention/policy";
import { emailSchema, firstError } from "@/lib/validation";
import { cleanName, cleanText } from "@/lib/sanitize";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { staffInviteEmail } from "@/lib/email/templates";
import { findSchoolStudent } from "@/lib/staff/data-requests";
import { purgeAccount } from "@/lib/account/delete";
import { fail, ok, type ActionResult } from "@/lib/action";

const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);
const role = z.enum(STAFF_ROLES);
const buildings = z
  .array(
    z
      .string()
      .max(60)
      .transform((b) => cleanText(b, { multiline: false })),
  )
  .max(40)
  .default([])
  .transform((list) => [...new Set(list.filter(Boolean))]);

function scopesFor(r: StaffRole, list: string[], accommodations = false) {
  if (r === "ra") return { buildings: list, communities: [] };
  // Housing staff can be the school's accommodation coordinators (Phase 1.E).
  if (r === "housing_staff" && accommodations) return { accommodations: true };
  return {};
}

function revalidateStaff() {
  revalidatePath("/staff", "layout");
}

export async function selectStaffSchool(id: string): Promise<ActionResult> {
  const context = await getStaffContext();
  if (!context || !context.schools.some((s) => s.id === id))
    return fail("You don't have access to that school.");
  cookies().set(STAFF_SCHOOL_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 31536000,
  });
  revalidateStaff();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Invites
// ─────────────────────────────────────────────────────────────────────────────

const inviteInput = z.object({
  schoolId,
  email: emailSchema,
  role,
  buildings,
  accommodations: z.boolean().default(false),
});

export async function inviteStaff(raw: z.input<typeof inviteInput>): Promise<ActionResult> {
  const parsed = inviteInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const input = parsed.data;
  const actorId = await assertRole(input.schoolId, "manageTeam");
  if (!actorId) return fail("Only housing admins can invite people.");
  if (input.role === "ra" && input.buildings.length === 0)
    return fail("Pick at least one building for an RA.");
  if (!(await rateLimit(`staff-invite:${actorId}`, LIMITS.staffInvitesPerDay))) {
    return fail("That's a lot of invites for one day. Try again tomorrow.");
  }

  const db = createAdminClient();
  const [{ data: emailSchool }, { data: school }, { data: actor }, { data: isPlatform }] =
    await Promise.all([
      db.rpc("school_for_email", { p_email: input.email }),
      db.from("schools").select("name, email_domains").eq("id", input.schoolId).single(),
      db.from("profiles").select("first_name").eq("id", actorId).single(),
      db.from("admins").select("user_id").eq("user_id", actorId).maybeSingle(),
    ]);
  if (!school) return fail("Unknown school.");
  if (emailSchool !== input.schoolId) {
    return fail(`Use a ${school.email_domains.map((d) => `@${d}`).join(" or ")} address.`);
  }

  // Already on the team?
  const { data: existingUser } = await db
    .from("user_settings")
    .select("user_id")
    .eq("email", input.email)
    .maybeSingle();
  if (existingUser) {
    const { data: member } = await db
      .from("staff_members")
      .select("id")
      .eq("user_id", existingUser.user_id)
      .eq("school_id", input.schoolId)
      .maybeSingle();
    if (member) return fail("They're already on the team. Change their role instead.");
  }

  // A fresh invite replaces any pending one for the same address.
  await db
    .from("staff_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("school_id", input.schoolId)
    .eq("email", input.email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const { token, hash } = newInviteToken();
  const { data: invite, error } = await db
    .from("staff_invites")
    .insert({
      school_id: input.schoolId,
      email: input.email,
      role: input.role,
      scopes: scopesFor(input.role, input.buildings, input.accommodations),
      token_hash: hash,
      expires_at: inviteExpiry().toISOString(),
      created_by: actorId,
      created_by_platform: Boolean(isPlatform),
    })
    .select("id")
    .single();
  if (error || !invite) return fail("Couldn't create the invite.");

  await sendEmail({
    to: input.email,
    ...staffInviteEmail(
      actor?.first_name || "Your team",
      school.name,
      ROLE_INFO[input.role].label,
      token,
    ),
  });
  await logAudit({
    actorId,
    schoolId: input.schoolId,
    action: "staff_invite_sent",
    entity: "staff_invite",
    entityId: invite.id,
    meta: { email: input.email, role: input.role, buildings: input.buildings },
  });
  revalidateStaff();
  return ok();
}

async function loadInvite(inviteId: string) {
  if (!z.string().uuid().safeParse(inviteId).success) return null;
  const { data } = await createAdminClient()
    .from("staff_invites")
    .select("id, school_id, email, role, accepted_at, revoked_at")
    .eq("id", inviteId)
    .maybeSingle();
  return data;
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const invite = await loadInvite(inviteId);
  if (!invite) return fail("That invite no longer exists.");
  const actorId = await assertRole(invite.school_id, "manageTeam");
  if (!actorId) return fail("Only housing admins can manage invites.");
  if (invite.accepted_at) return fail("That invite was already accepted.");
  await createAdminClient()
    .from("staff_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invite.id);
  await logAudit({
    actorId,
    schoolId: invite.school_id,
    action: "staff_invite_revoked",
    entity: "staff_invite",
    entityId: invite.id,
    meta: { email: invite.email },
  });
  revalidateStaff();
  return ok();
}

export async function resendInvite(inviteId: string): Promise<ActionResult> {
  const invite = await loadInvite(inviteId);
  if (!invite || invite.revoked_at) return fail("That invite no longer exists.");
  if (invite.accepted_at) return fail("That invite was already accepted.");
  const actorId = await assertRole(invite.school_id, "manageTeam");
  if (!actorId) return fail("Only housing admins can manage invites.");
  if (!(await rateLimit(`staff-invite:${actorId}`, LIMITS.staffInvitesPerDay))) {
    return fail("That's a lot of invites for one day. Try again tomorrow.");
  }
  const db = createAdminClient();
  const { token, hash } = newInviteToken();
  await db
    .from("staff_invites")
    .update({ token_hash: hash, expires_at: inviteExpiry().toISOString() })
    .eq("id", invite.id);
  const [{ data: school }, { data: actor }] = await Promise.all([
    db.from("schools").select("name").eq("id", invite.school_id).single(),
    db.from("profiles").select("first_name").eq("id", actorId).single(),
  ]);
  await sendEmail({
    to: invite.email,
    ...staffInviteEmail(
      actor?.first_name || "Your team",
      school?.name ?? "your school",
      ROLE_INFO[invite.role as StaffRole].label,
      token,
    ),
  });
  await logAudit({
    actorId,
    schoolId: invite.school_id,
    action: "staff_invite_resent",
    entity: "staff_invite",
    entityId: invite.id,
    meta: { email: invite.email },
  });
  revalidateStaff();
  return ok();
}

const acceptInput = z.object({
  token: z.string().min(20).max(64),
  firstName: z.string().transform(cleanName).pipe(z.string().min(1, "Add your first name.")),
  lastName: z.string().max(60).transform(cleanName),
});

/** Accepting an invite turns the signed-in account into a staff account for that school. */
export async function acceptInvite(
  raw: z.input<typeof acceptInput>,
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = await getUser();
  if (!user) return fail("Sign in first.");
  const parsed = acceptInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { token, firstName, lastName } = parsed.data;

  const db = createAdminClient();
  const { data: invite } = await db
    .from("staff_invites")
    .select(
      "id, school_id, email, role, scopes, expires_at, accepted_at, revoked_at, created_by, created_by_platform",
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!invite || invite.revoked_at)
    return fail("This invite was withdrawn. Ask your housing admin for a new one.");
  if (invite.accepted_at) return fail("This invite was already used.");
  if (new Date(invite.expires_at).getTime() < Date.now())
    return fail("This invite expired. Ask your housing admin to resend it.");
  if ((user.email ?? "").toLowerCase() !== invite.email) {
    return fail(`This invite is for ${invite.email}. Sign out and sign in with that address.`);
  }

  const { data: profile } = await db
    .from("profiles")
    .select("school_id, onboarding_completed_at, is_staff, banned_at")
    .eq("id", user.id)
    .single();
  if (!profile || profile.banned_at) return fail("This account can't accept invites.");
  if (profile.school_id !== invite.school_id) return fail("This invite is for a different school.");
  // Turning an active student into staff removes them from matching, so the Rumi team must sign off.
  if (profile.onboarding_completed_at && !profile.is_staff && !invite.created_by_platform) {
    return fail(
      "This email already has a student account. Ask the Rumi team to send the invite instead.",
    );
  }

  const { error } = await db.from("staff_members").upsert(
    {
      user_id: user.id,
      school_id: invite.school_id,
      role: invite.role,
      scopes: invite.scopes,
      invited_by: invite.created_by,
      disabled_at: null,
    },
    { onConflict: "user_id,school_id" },
  );
  if (error) return fail("Couldn't accept the invite. Try again.");

  await Promise.all([
    db
      .from("staff_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", invite.id),
    db
      .from("profiles")
      .update({
        is_staff: true,
        first_name: firstName,
        last_initial: lastName.slice(0, 1).toUpperCase(),
      })
      .eq("id", user.id),
    db.from("user_settings").update({ last_name: lastName }).eq("user_id", user.id),
    db.rpc("prune_match_scores", { p_user: user.id, p_keep: [] }),
  ]);
  cookies().set(STAFF_SCHOOL_COOKIE, invite.school_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 31536000,
  });
  await logAudit({
    actorId: user.id,
    schoolId: invite.school_id,
    action: "staff_invite_accepted",
    entity: "staff_member",
    entityId: user.id,
    meta: { role: invite.role },
  });
  return ok({ redirectTo: "/staff" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Team
// ─────────────────────────────────────────────────────────────────────────────

async function loadMember(memberId: string) {
  if (!z.string().uuid().safeParse(memberId).success) return null;
  const { data } = await createAdminClient()
    .from("staff_members")
    .select("id, user_id, school_id, role, disabled_at")
    .eq("id", memberId)
    .maybeSingle();
  return data;
}

/** A school must always keep at least one enabled housing admin. */
async function wouldLeaveNoAdmin(schoolIdValue: string, memberId: string) {
  const { count } = await createAdminClient()
    .from("staff_members")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolIdValue)
    .eq("role", "housing_admin")
    .is("disabled_at", null)
    .neq("id", memberId);
  return (count ?? 0) === 0;
}

const memberInput = z.object({
  memberId: z.string().uuid(),
  role,
  buildings,
  accommodations: z.boolean().default(false),
});

export async function updateStaffMember(raw: z.input<typeof memberInput>): Promise<ActionResult> {
  const parsed = memberInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const member = await loadMember(parsed.data.memberId);
  if (!member) return fail("They're no longer on the team.");
  const actorId = await assertRole(member.school_id, "manageTeam");
  if (!actorId) return fail("Only housing admins can change roles.");
  if (parsed.data.role === "ra" && parsed.data.buildings.length === 0)
    return fail("Pick at least one building for an RA.");
  if (
    member.role === "housing_admin" &&
    parsed.data.role !== "housing_admin" &&
    (await wouldLeaveNoAdmin(member.school_id, member.id))
  ) {
    return fail("The school needs at least one housing admin. Make someone else an admin first.");
  }
  const { error } = await createAdminClient()
    .from("staff_members")
    .update({
      role: parsed.data.role,
      scopes: scopesFor(parsed.data.role, parsed.data.buildings, parsed.data.accommodations),
    })
    .eq("id", member.id);
  if (error) return fail("Couldn't update their role.");
  await logAudit({
    actorId,
    schoolId: member.school_id,
    action: "staff_role_changed",
    entity: "staff_member",
    entityId: member.user_id,
    meta: {
      from: member.role,
      to: parsed.data.role,
      buildings: parsed.data.buildings,
      accommodations: parsed.data.accommodations,
    },
  });
  revalidateStaff();
  return ok();
}

export async function setStaffDisabled(input: {
  memberId: string;
  disabled: boolean;
}): Promise<ActionResult> {
  const member = await loadMember(input.memberId);
  if (!member) return fail("They're no longer on the team.");
  const actorId = await assertRole(member.school_id, "manageTeam");
  if (!actorId) return fail("Only housing admins can change access.");
  if (
    input.disabled &&
    member.role === "housing_admin" &&
    (await wouldLeaveNoAdmin(member.school_id, member.id))
  ) {
    return fail("The school needs at least one housing admin. Make someone else an admin first.");
  }
  const { error } = await createAdminClient()
    .from("staff_members")
    .update({ disabled_at: input.disabled ? new Date().toISOString() : null })
    .eq("id", member.id);
  if (error) return fail("Couldn't change their access.");
  await logAudit({
    actorId,
    schoolId: member.school_id,
    action: input.disabled ? "staff_disabled" : "staff_enabled",
    entity: "staff_member",
    entityId: member.user_id,
  });
  revalidateStaff();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Privacy settings
// ─────────────────────────────────────────────────────────────────────────────

const retentionInput = z.object({
  schoolId,
  entity: z.enum(RETENTION_ENTITIES),
  days: z.number().int(),
});

export async function updateRetention(raw: z.input<typeof retentionInput>): Promise<ActionResult> {
  const parsed = retentionInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, entity, days } = parsed.data;
  const actorId = await assertRole(school, "managePrivacy");
  if (!actorId) return fail("Only housing admins can change retention.");
  const { min, max, label } = RETENTION_COPY[entity];
  if (days < min || days > max) return fail(`${label}: pick between ${min} and ${max} days.`);
  const { error } = await createAdminClient().from("retention_policies").upsert({
    school_id: school,
    entity,
    days,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail("Couldn't save that.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "retention_changed",
    entity: "retention_policy",
    entityId: entity,
    meta: { days },
  });
  revalidateStaff();
  return ok();
}

const lookupInput = z.object({
  schoolId: z.string().regex(/^[a-z0-9-]{2,40}$/),
  email: z.string().max(254),
});

/** Finds a student for a records request; shows only their name and whether they share with housing. */
export async function lookupDataRequestStudent(
  raw: z.input<typeof lookupInput>,
): Promise<ActionResult<{ name: string; consented: boolean }>> {
  const parsed = lookupInput.safeParse(raw);
  if (!parsed.success) return fail("Enter the student's email.");
  const actorId = await assertRole(parsed.data.schoolId, "managePrivacy");
  if (!actorId) return fail("Only housing admins handle records requests.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many lookups. Try again later.");
  const student = await findSchoolStudent(parsed.data.schoolId, parsed.data.email);
  if (!student) return fail("No student at your school uses that email.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "student_record_looked_up",
    entity: "profile",
    entityId: student.id,
  });
  return ok({ name: student.name, consented: student.consented });
}

const deleteInput = z.object({
  schoolId: z.string().regex(/^[a-z0-9-]{2,40}$/),
  email: z.string().max(254),
  reason: z
    .string()
    .transform((v) => cleanText(v))
    .pipe(z.string().min(15, "Describe the request in a sentence.").max(500)),
  confirmation: z.string(),
});

/** Deletes a student's account on request (0.2). Audited before deletion; can't be undone. */
export async function deleteStudentOnRequest(
  raw: z.input<typeof deleteInput>,
): Promise<ActionResult> {
  const parsed = deleteInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the request.");
  if (parsed.data.confirmation.trim().toUpperCase() !== "DELETE")
    return fail("Type DELETE to confirm.");
  const actorId = await assertRole(parsed.data.schoolId, "managePrivacy");
  if (!actorId) return fail("Only housing admins handle records requests.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again later.");
  const student = await findSchoolStudent(parsed.data.schoolId, parsed.data.email);
  if (!student) return fail("No student at your school uses that email.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "student_deleted_on_request",
    entity: "profile",
    entityId: student.id,
    meta: { reason: parsed.data.reason },
  });
  try {
    await purgeAccount(student.id);
  } catch (error) {
    console.error("[staff] delete on request failed", error);
    return fail("Couldn't delete the account. Try again or contact Rumi.");
  }
  revalidatePath("/staff", "layout");
  return ok();
}
