"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";

export async function resolveRaAlert(
  schoolId: string,
  alertUserId: string,
  outcome: "resolved" | "room_change" | "escalated",
  note?: string,
): Promise<ActionResult> {
  const actorId = await assertRole(schoolId, "raWorkspace");
  if (!actorId) return fail("Unauthorized. RA workspace permissions required.");

  await logAudit({
    actorId,
    schoolId,
    action: "resolved_ra_alert",
    entity: "checkin_list",
    meta: { alertUserId, outcome, note },
  });

  revalidatePath("/staff/ra");
  return ok();
}

export async function reopenRoommateAgreement(
  schoolId: string,
  groupId: string,
  reason: string,
): Promise<ActionResult> {
  const actorId = await assertRole(schoolId, "raWorkspace");
  if (!actorId) return fail("Unauthorized. RA workspace permissions required.");

  const supabase = createClient();
  const { error } = await supabase
    .from("agreements")
    .update({ status: "reopened" })
    .eq("group_id", groupId);

  if (error) return fail(error.message);

  await logAudit({
    actorId,
    schoolId,
    action: "reopened_agreement_for_mediation",
    entity: "agreements",
    meta: { groupId, reason },
  });

  revalidatePath(`/groups/${groupId}/agreement`);
  revalidatePath("/staff/ra");
  return ok();
}
