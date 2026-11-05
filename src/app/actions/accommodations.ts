"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/staff/audit";
import { runInBackground } from "@/lib/background";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { isAccommodationKey } from "@/lib/matching/accommodations";

const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);
const uuid = z.string().uuid();

/**
 * Accommodation constraints (Phase 1.E). Housing admins, or housing staff with the
 * accommodations scope (the school's disability-coordination staff). Only for students who
 * share their results with housing. Every change is audited and re-ranks the student.
 */
export async function canManageAccommodations(school: string): Promise<string | null> {
  if (!schoolId.safeParse(school).success) return null;
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().rpc("can_manage_accommodations", { p_school: school });
  return data === true ? user.id : null;
}

async function consentedStudent(school: string, userId: string) {
  const db = createAdminClient();
  const [{ data: profile }, { data: consent }] = await Promise.all([
    db.from("profiles").select("id, school_id, is_staff").eq("id", userId).maybeSingle(),
    db.rpc("has_consent", { p_uid: userId, p_kind: "share_with_housing" }),
  ]);
  return profile && profile.school_id === school && !profile.is_staff && consent === true;
}

const setInput = z.object({
  schoolId,
  userId: uuid,
  key: z.string().refine(isAccommodationKey, "Pick an accommodation."),
  expiresOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  note: z
    .string()
    .max(1000)
    .transform((v) => cleanText(v))
    .optional(),
  legalHold: z.boolean().default(false),
});

export async function setAccommodation(raw: z.input<typeof setInput>): Promise<ActionResult> {
  const parsed = setInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const a = parsed.data;
  const actorId = await canManageAccommodations(a.schoolId);
  if (!actorId) return fail("Only housing admins and accommodation staff can do that.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (!(await consentedStudent(a.schoolId, a.userId)))
    return fail("This student hasn't chosen to share with your office.");
  if (a.expiresOn && a.expiresOn < new Date().toISOString().slice(0, 10))
    return fail("Pick a future end date, or leave it empty.");

  const { data: type } = await createAdminClient()
    .from("accommodation_types")
    .select("active")
    .eq("school_id", a.schoolId)
    .eq("key", a.key)
    .maybeSingle();
  if (!type?.active) return fail("Your school doesn't use that accommodation.");
  const { error } = await createAdminClient()
    .from("accommodation_constraints")
    .upsert(
      {
        school_id: a.schoolId,
        user_id: a.userId,
        constraint_key: a.key,
        set_by: actorId,
        expires_on: a.expiresOn || null,
        note_enc: a.note ? encrypt(a.note) : null,
        legal_hold: a.legalHold,
      },
      { onConflict: "user_id,constraint_key" },
    );
  if (error) return fail("Couldn't save the accommodation.");
  await logAudit({
    actorId,
    schoolId: a.schoolId,
    action: "accommodation_set",
    entity: "student",
    entityId: a.userId,
    meta: { key: a.key, expiresOn: a.expiresOn || null, legalHold: a.legalHold },
  });
  runInBackground("accommodation-recompute", () => recomputeMatchesFor(a.userId));
  revalidatePath("/staff/accommodations");
  return ok();
}

export async function removeAccommodation(
  school: string,
  userId: string,
  key: string,
): Promise<ActionResult> {
  if (!uuid.safeParse(userId).success || !isAccommodationKey(key))
    return fail("That accommodation isn't available.");
  const actorId = await canManageAccommodations(school);
  if (!actorId) return fail("Only housing admins and accommodation staff can do that.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { error } = await createAdminClient()
    .from("accommodation_constraints")
    .delete()
    .eq("school_id", school)
    .eq("user_id", userId)
    .eq("constraint_key", key);
  if (error) return fail("Couldn't remove it.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "accommodation_removed",
    entity: "student",
    entityId: userId,
    meta: { key },
  });
  runInBackground("accommodation-recompute", () => recomputeMatchesFor(userId));
  revalidatePath("/staff/accommodations");
  return ok();
}
