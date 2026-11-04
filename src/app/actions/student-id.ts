"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";

const studentId = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{4,20}$/, "Use the 4–20 letters and numbers on your student ID.");

/**
 * Optional student ID, used only to match a Rumi pair to the student's housing application.
 * Stored encrypted; exported to housing only while the student shares their results.
 */
export async function setStudentId(
  raw: string | null,
): Promise<ActionResult<{ last4: string | null }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!(await rateLimit(`student-id:${user.id}`, LIMITS.studentIdChangesPerHour)))
    return fail("Too many changes. Try again later.");
  let value: string | null = null;
  if (raw !== null && raw.trim() !== "") {
    const parsed = studentId.safeParse(raw);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your student ID.");
    value = parsed.data;
  }
  const { error } = await createAdminClient()
    .from("user_settings")
    .update({ student_id_enc: value ? encrypt(value) : null })
    .eq("user_id", user.id);
  if (error) return fail("Couldn't save that.");
  revalidatePath("/settings/privacy");
  return ok({ last4: value ? value.slice(-4) : null });
}
