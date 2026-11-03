"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import type { AccommodationConstraintKey } from "@/lib/matching/types";
import { isAccommodationConstraintKey } from "@/lib/safety/accommodations";

export interface AccommodationRecord {
  id: string;
  constraintKey: AccommodationConstraintKey;
  expiresOn: string | null;
  createdAt: string;
}

export async function setAccommodationConstraint(
  schoolId: string,
  userId: string,
  constraintKey: AccommodationConstraintKey,
  expiresOn?: string | null,
  note?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const actorId = await assertRole(schoolId, "managePrivacy");
  if (!actorId) return fail("Unauthorized. Housing Admin role required for accommodation records.");

  if (!isAccommodationConstraintKey(constraintKey)) {
    return fail("Invalid accommodation constraint key.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("accommodation_constraints")
    .upsert(
      {
        school_id: schoolId,
        user_id: userId,
        constraint_key: constraintKey,
        set_by: actorId,
        expires_on: expiresOn || null,
        note_enc: note || null,
      },
      { onConflict: "user_id, constraint_key" },
    )
    .select("id")
    .single();

  if (error || !data) return fail(error?.message ?? "Failed to save constraint.");

  await logAudit({
    actorId,
    schoolId,
    action: "set_accommodation_constraint",
    entity: "accommodation_constraints",
    meta: { targetUserId: userId, constraintKey, expiresOn },
  });

  revalidatePath("/staff/students");
  revalidatePath("/staff/pairings");
  return ok({ id: data.id });
}

export async function removeAccommodationConstraint(
  schoolId: string,
  userId: string,
  constraintKey: AccommodationConstraintKey,
): Promise<ActionResult> {
  const actorId = await assertRole(schoolId, "managePrivacy");
  if (!actorId) return fail("Unauthorized. Housing Admin role required.");

  const supabase = createClient();
  const { error } = await supabase
    .from("accommodation_constraints")
    .delete()
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .eq("constraint_key", constraintKey);

  if (error) return fail(error.message);

  await logAudit({
    actorId,
    schoolId,
    action: "removed_accommodation_constraint",
    entity: "accommodation_constraints",
    meta: { targetUserId: userId, constraintKey },
  });

  revalidatePath("/staff/students");
  revalidatePath("/staff/pairings");
  return ok();
}

export async function getStudentAccommodations(
  schoolId: string,
  userId: string,
): Promise<ActionResult<AccommodationRecord[]>> {
  const actorId = await assertRole(schoolId, "managePrivacy");
  if (!actorId) return fail("Unauthorized. Housing Admin role required.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("accommodation_constraints")
    .select("id, constraint_key, expires_on, created_at")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message);

  const records: AccommodationRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    constraintKey: row.constraint_key as AccommodationConstraintKey,
    expiresOn: row.expires_on,
    createdAt: row.created_at,
  }));

  return ok(records);
}
