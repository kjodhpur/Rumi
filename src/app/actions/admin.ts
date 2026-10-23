"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { runInBackground } from "@/lib/background";
import { cleanText } from "@/lib/sanitize";
import { fail, ok, type ActionResult } from "@/lib/action";

const uuid = z.string().uuid();
const note = z.string().max(1000).optional().transform((v) => (v ? cleanText(v) : null));

async function log(actorId: string, action: string, targetId: string | null, reportId: string | null, meta: Record<string, string | null> = {}) {
  await createAdminClient().from("moderation_log").insert({ actor_id: actorId, action, target_id: targetId, report_id: reportId, meta });
}

export async function updateReportStatus(input: {
  reportId: string;
  status: "reviewing" | "actioned" | "dismissed" | "open";
  note?: string;
}): Promise<ActionResult> {
  const adminId = await requireAdmin();
  if (!adminId) return fail("Admins only.");
  if (!uuid.safeParse(input.reportId).success) return fail("Unknown report.");
  const resolution = note.parse(input.note);
  const { error } = await createAdminClient()
    .from("reports")
    .update({
      status: input.status,
      resolution_note: resolution,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.reportId);
  if (error) return fail("Couldn't update the report.");
  await log(adminId, `report_${input.status}`, null, input.reportId, { note: resolution });
  revalidatePath("/admin");
  return ok();
}

/** Bans hide the profile everywhere, stop sign-ins, and close their matches. */
export async function setBan(input: { userId: string; banned: boolean; reason?: string; reportId?: string }): Promise<ActionResult> {
  const adminId = await requireAdmin();
  if (!adminId) return fail("Admins only.");
  if (!uuid.safeParse(input.userId).success) return fail("Unknown user.");
  if (input.userId === adminId) return fail("You can't ban yourself.");
  const admin = createAdminClient();
  const reason = note.parse(input.reason);

  const { error } = await admin
    .from("profiles")
    .update({ banned_at: input.banned ? new Date().toISOString() : null, ban_reason: input.banned ? reason : null })
    .eq("id", input.userId);
  if (error) return fail("Couldn't update the user.");
  await admin.auth.admin.updateUserById(input.userId, { ban_duration: input.banned ? "876000h" : "none" });

  if (input.reportId && uuid.safeParse(input.reportId).success) {
    await admin
      .from("reports")
      .update({ status: "actioned", reviewed_by: adminId, reviewed_at: new Date().toISOString(), resolution_note: reason })
      .eq("id", input.reportId);
  }
  await log(adminId, input.banned ? "ban" : "unban", input.userId, input.reportId ?? null, { reason });
  runInBackground("recompute", () => recomputeMatchesFor(input.userId));
  revalidatePath("/admin");
  return ok();
}

/** Forces a fresh school-email sign-in before they can see verified-only profiles. */
export async function revokeVerification(userId: string): Promise<ActionResult> {
  const adminId = await requireAdmin();
  if (!adminId) return fail("Admins only.");
  if (!uuid.safeParse(userId).success) return fail("Unknown user.");
  const { error } = await createAdminClient().from("profiles").update({ student_verified_at: null }).eq("id", userId);
  if (error) return fail("Couldn't update the user.");
  await log(adminId, "revoke_verification", userId, null);
  revalidatePath("/admin");
  return ok();
}
