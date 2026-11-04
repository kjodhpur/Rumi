"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import {
  parseAllowlistCsv,
  isEmailAllowlisted,
  hashPersonalEmail,
} from "@/lib/admissions/allowlist";
import { logAudit } from "@/lib/staff/audit";
import { assertRole } from "@/lib/staff/context";

export async function uploadAdmitAllowlist(
  schoolId: string,
  csvContent: string,
  termId?: string,
): Promise<ActionResult<{ uploadedCount: number }>> {
  const actorId = await assertRole(schoolId, "viewStudents");
  if (!actorId) return fail("Unauthorized. Staff access required.");

  const parsed = parseAllowlistCsv(csvContent);
  if (parsed.length === 0) {
    return fail("No valid email addresses found in upload.");
  }

  const rows = parsed.map((p) => ({
    school_id: schoolId,
    email_hash: p.emailHash,
    term_id: termId || null,
  }));

  const supabase = createClient();
  const { error } = await supabase
    .from("admit_allowlist")
    .upsert(rows, { onConflict: "school_id, email_hash" });

  if (error) return fail(error.message);

  await logAudit({
    actorId,
    schoolId,
    action: "uploaded_admit_allowlist",
    entity: "admit_allowlist",
    meta: { count: rows.length, termId },
  });

  revalidatePath("/staff/students");
  revalidatePath("/staff/settings/term");
  return ok({ uploadedCount: rows.length });
}

export async function verifyPreArrivalAdmit(
  email: string,
  schoolId: string,
): Promise<ActionResult<{ allowlisted: boolean }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const status = await isEmailAllowlisted(supabase, schoolId, email);

  if (!status.allowlisted) {
    return fail("Email not found on the admitted student allowlist for this school.");
  }

  // Mark email as used and set student as verified pre-arrival
  const hash = hashPersonalEmail(email);
  await supabase
    .from("admit_allowlist")
    .update({ used_at: new Date().toISOString() })
    .eq("school_id", schoolId)
    .eq("email_hash", hash);

  await supabase
    .from("profiles")
    .update({
      pre_arrival: true,
      student_verified_at: new Date().toISOString(),
      school_id: schoolId,
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
  revalidatePath("/matches");
  return ok({ allowlisted: true });
}

export async function setStudentTrack(
  track: "freshman" | "returning" | "transfer" | "grad",
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ track }).eq("id", user.id);

  if (error) return fail(error.message);

  revalidatePath("/settings/profile");
  revalidatePath("/matches");
  return ok();
}
