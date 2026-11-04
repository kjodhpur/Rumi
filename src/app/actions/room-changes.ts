"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { validTags } from "@/lib/staff/room-changes";

const schoolId = z.string().regex(/^[a-z0-9-]{2,40}$/);

const tagInput = z.object({
  schoolId,
  id: z.string().uuid(),
  reasonKeys: z
    .array(z.string().regex(/^[a-z_]{2,30}$/))
    .min(1, "Pick at least one reason.")
    .max(3, "Pick up to three reasons."),
  staffNote: z.string().max(500).optional(),
});

/** Tags (or retags, audited) a room-change request with 1–3 reasons (1.B). RAs: own buildings only. */
export async function tagRoomChange(raw: z.input<typeof tagInput>): Promise<ActionResult> {
  const parsed = tagInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Pick 1–3 reasons.");
  const t = parsed.data;
  const actorId = await assertRole(t.schoolId, "tagRoomChanges");
  if (!actorId) return fail("Your role can't tag room changes.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const db = createAdminClient();
  const [{ data: request }, { data: reasons }] = await Promise.all([
    db
      .from("room_change_requests")
      .select("id, building, reason_keys, staff_note")
      .eq("id", t.id)
      .eq("school_id", t.schoolId)
      .maybeSingle(),
    db.from("room_change_reasons").select("key").eq("school_id", t.schoolId).eq("active", true),
  ]);
  if (!request) return fail("That request isn't available.");
  const { data: inScope } = await createClient().rpc("staff_scope_includes", {
    p_school: t.schoolId,
    p_building: request.building ?? "",
  });
  if (inScope !== true) return fail("That request is outside your buildings.");
  const keys = [...new Set(t.reasonKeys)];
  if (
    !validTags(
      keys,
      (reasons ?? []).map((r) => r.key),
    )
  )
    return fail("Pick reasons from your school's list.");
  const note = t.staffNote === undefined ? request.staff_note : cleanText(t.staffNote) || null;
  const { error } = await db
    .from("room_change_requests")
    .update({
      reason_keys: keys,
      staff_note: note,
      tagged_by: actorId,
      tagged_at: new Date().toISOString(),
    })
    .eq("id", t.id);
  if (error) return fail("Couldn't save the tags.");
  const retag = request.reason_keys.length > 0;
  await logAudit({
    actorId,
    schoolId: t.schoolId,
    action: retag ? "room_change_retagged" : "room_change_tagged",
    entity: "room_change_request",
    entityId: t.id,
    meta: { from: request.reason_keys, to: keys, noteChanged: note !== request.staff_note },
  });
  revalidatePath("/staff/analytics/room-changes");
  return ok();
}

const reasonInput = z.object({
  schoolId,
  key: z.string().regex(/^[a-z_]{2,30}$/, "Use lowercase letters and underscores."),
  label: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(2).max(60)),
  active: z.boolean(),
});

/** The school's reason taxonomy. Reasons are turned off, never deleted, so old tags stay readable. */
export async function saveRoomChangeReason(
  raw: z.input<typeof reasonInput>,
): Promise<ActionResult> {
  const parsed = reasonInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the reason.");
  const r = parsed.data;
  const actorId = await assertRole(r.schoolId, "configureSchool");
  if (!actorId) return fail("Only housing admins can edit the reasons.");
  if (!(await rateLimit(`staff-writes:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const db = createAdminClient();
  const { data: existing } = await db
    .from("room_change_reasons")
    .select("key")
    .eq("school_id", r.schoolId);
  const position = existing?.some((e) => e.key === r.key) ? undefined : (existing?.length ?? 0);
  const { error } = await db
    .from("room_change_reasons")
    .upsert(
      {
        school_id: r.schoolId,
        key: r.key,
        label: r.label,
        active: r.active,
        ...(position === undefined ? {} : { position }),
      },
      { onConflict: "school_id,key" },
    );
  if (error) return fail("Couldn't save the reason.");
  await logAudit({
    actorId,
    schoolId: r.schoolId,
    action: "room_change_reason_saved",
    entity: "room_change_reason",
    entityId: r.key,
    meta: { label: r.label, active: r.active },
  });
  revalidatePath("/staff/analytics/room-changes");
  return ok();
}
