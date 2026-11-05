"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { dispatchMany } from "@/lib/notifications/dispatch";

const uuid = z.string().uuid();
const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);

/**
 * RA workspace writes. Each one re-checks the role in SQL and reads the case through RLS
 * first, so an RA can only touch cases in their buildings for students who shared or asked.
 */
async function caseFor(school: string, caseId: string) {
  if (!schoolId.safeParse(school).success || !uuid.safeParse(caseId).success) return null;
  const actorId = await assertRole(school, "raWorkspace");
  if (!actorId) return null;
  if (!(await rateLimit(`ra:${actorId}`, LIMITS.raWritesPerHour))) return "limited" as const;
  const { data } = await createClient()
    .from("ra_cases")
    .select("id, school_id, user_id, assignment_id, building, status")
    .eq("id", caseId)
    .eq("school_id", school)
    .maybeSingle();
  return data ? { actorId, row: data } : null;
}

/** An alert without a case yet (e.g. an older check-in): the RA opens one to start notes. */
export async function openCase(
  school: string,
  assignmentId: string,
): Promise<ActionResult<{ caseId: string }>> {
  if (!schoolId.safeParse(school).success || !uuid.safeParse(assignmentId).success)
    return fail("That alert isn't available.");
  const actorId = await assertRole(school, "raWorkspace");
  if (!actorId) return fail("RA workspace access is required.");
  if (!(await rateLimit(`ra-write:${actorId}`, LIMITS.raWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  // The alert must be visible to this RA through the consent- and scope-aware list.
  const { data: list } = await createClient().rpc("ra_risk_list", { p_school: school });
  const alert = (list ?? []).find((r) => r.assignment_id === assignmentId);
  if (!alert) return fail("That alert isn't available.");
  if (alert.case_id && alert.case_status === "open") return ok({ caseId: alert.case_id });
  const { data, error } = await createAdminClient()
    .from("ra_cases")
    .insert({
      school_id: school,
      assignment_id: assignmentId,
      user_id: alert.user_id,
      building: alert.building,
      opened_by: actorId,
    })
    .select("id")
    .single();
  if (error || !data) return fail("Couldn't open a case.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "ra_case_opened",
    entity: "ra_case",
    entityId: data.id,
  });
  revalidatePath("/staff/ra");
  return ok({ caseId: data.id });
}

const noteInput = z.object({
  school: schoolId,
  caseId: uuid,
  body: z
    .string()
    .transform((v) => cleanText(v))
    .pipe(z.string().min(1, "Write a note.").max(2000)),
});

export async function addCaseNote(raw: z.input<typeof noteInput>): Promise<ActionResult> {
  const parsed = noteInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const found = await caseFor(parsed.data.school, parsed.data.caseId);
  if (found === "limited") return fail("Too many changes. Try again in a bit.");
  if (!found) return fail("That case isn't available.");
  const { error } = await createAdminClient()
    .from("ra_case_notes")
    .insert({ case_id: found.row.id, author_id: found.actorId, body: parsed.data.body });
  if (error) return fail("Couldn't save the note.");
  await logAudit({
    actorId: found.actorId,
    schoolId: found.row.school_id,
    action: "ra_note_added",
    entity: "ra_case",
    entityId: found.row.id,
  });
  revalidatePath("/staff/ra");
  return ok();
}

const taskInput = z.object({
  school: schoolId,
  caseId: uuid,
  title: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(1, "Name the follow-up.").max(160)),
  dueOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
});

export async function addCaseTask(raw: z.input<typeof taskInput>): Promise<ActionResult> {
  const parsed = taskInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const found = await caseFor(parsed.data.school, parsed.data.caseId);
  if (found === "limited") return fail("Too many changes. Try again in a bit.");
  if (!found) return fail("That case isn't available.");
  const { error } = await createAdminClient()
    .from("ra_tasks")
    .insert({
      case_id: found.row.id,
      title: parsed.data.title,
      due_on: parsed.data.dueOn || null,
      created_by: found.actorId,
    });
  if (error) return fail("Couldn't add the follow-up.");
  await logAudit({
    actorId: found.actorId,
    schoolId: found.row.school_id,
    action: "ra_task_added",
    entity: "ra_case",
    entityId: found.row.id,
  });
  revalidatePath("/staff/ra");
  return ok();
}

export async function setCaseTaskDone(
  school: string,
  caseId: string,
  taskId: string,
  done: boolean,
): Promise<ActionResult> {
  if (!uuid.safeParse(taskId).success) return fail("That follow-up isn't available.");
  const found = await caseFor(school, caseId);
  if (found === "limited") return fail("Too many changes. Try again in a bit.");
  if (!found) return fail("That case isn't available.");
  const { error } = await createAdminClient()
    .from("ra_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("case_id", found.row.id);
  if (error) return fail("Couldn't update the follow-up.");
  revalidatePath("/staff/ra");
  return ok();
}

const closeInput = z.object({
  school: schoolId,
  caseId: uuid,
  outcome: z.enum(["resolved", "room_change", "escalated"]),
  note: z
    .string()
    .max(2000)
    .transform((v) => cleanText(v))
    .optional(),
});

/** Record how it ended: resolved, room change, or escalated to housing/CARE. */
export async function closeCase(raw: z.input<typeof closeInput>): Promise<ActionResult> {
  const parsed = closeInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const found = await caseFor(parsed.data.school, parsed.data.caseId);
  if (found === "limited") return fail("Too many changes. Try again in a bit.");
  if (!found) return fail("That case isn't available.");
  if (found.row.status !== "open") return fail("That case is already closed.");
  const db = createAdminClient();
  const { error } = await db
    .from("ra_cases")
    .update({
      status: parsed.data.outcome,
      closed_by: found.actorId,
      closed_at: new Date().toISOString(),
    })
    .eq("id", found.row.id);
  if (error) return fail("Couldn't close the case.");
  if (parsed.data.note)
    await db
      .from("ra_case_notes")
      .insert({ case_id: found.row.id, author_id: found.actorId, body: parsed.data.note });
  await logAudit({
    actorId: found.actorId,
    schoolId: found.row.school_id,
    action: "ra_case_closed",
    entity: "ra_case",
    entityId: found.row.id,
    meta: { outcome: parsed.data.outcome },
  });
  revalidatePath("/staff/ra");
  return ok();
}

/** Reopen the room's agreement so they can revise it together (mediation). */
export async function reopenAgreementForMediation(
  school: string,
  caseId: string,
): Promise<ActionResult> {
  const found = await caseFor(school, caseId);
  if (found === "limited") return fail("Too many changes. Try again in a bit.");
  if (!found) return fail("That case isn't available.");
  const db = createAdminClient();
  const { data: membership } = await db
    .from("group_members")
    .select("group_id")
    .eq("user_id", found.row.user_id)
    .maybeSingle();
  if (!membership) return fail("This student isn't in a Rumi group.");
  const { data: agreement } = await db
    .from("agreements")
    .select("id, status, member_ids")
    .eq("group_id", membership.group_id)
    .maybeSingle();
  if (!agreement || agreement.status !== "signed")
    return fail("There's no signed agreement to reopen.");
  const { error } = await db
    .from("agreements")
    .update({ status: "reopened", updated_at: new Date().toISOString() })
    .eq("id", agreement.id);
  if (error) return fail("Couldn't reopen the agreement.");
  await db
    .from("agreement_events")
    .insert({ agreement_id: agreement.id, actor_id: found.actorId, kind: "reopened" });
  await dispatchMany(
    "agreements",
    agreement.member_ids.map((id) => ({
      userId: id,
      type: "agreement_reminder",
      entityId: agreement.id,
      title: "Your RA reopened your roommate agreement",
      body: "Revise it together, then everyone signs again.",
      href: `/groups/${membership.group_id}/agreement`,
    })),
  );
  await logAudit({
    actorId: found.actorId,
    schoolId: found.row.school_id,
    action: "agreement_reopened_for_mediation",
    entity: "agreement",
    entityId: agreement.id,
    meta: { caseId: found.row.id },
  });
  revalidatePath("/staff/ra");
  return ok();
}
