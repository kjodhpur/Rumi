"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { firstError } from "@/lib/validation";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { runInBackground } from "@/lib/background";
import { recomputeSchool } from "@/lib/matching/recompute";
import { cleanText } from "@/lib/sanitize";
import type { Json } from "@/types/database";

const schoolId = z.string().regex(/^[a-z0-9-]{2,40}$/);
const code = z.string().regex(/^[a-z0-9_]{2,40}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const percent = z.number().int().min(0).max(100).nullable();

async function housingAdmin(school: string) {
  const actorId = await assertRole(school, "configureSchool");
  if (!actorId) return null;
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return "limited" as const;
  return actorId;
}
const deny = (a: string | null) =>
  fail(
    a === "limited" ? "Too many changes. Try again in a bit." : "Only housing admins can do that.",
  );

const pilotInput = z
  .object({
    schoolId,
    residentialColleges: z.array(code).max(40),
    startsOn: isoDate,
    endsOn: isoDate,
    metrics: z.object({
      onboardedPct: percent,
      matchedPct: percent,
      agreementPct: percent,
      roomChangePct: percent,
    }),
  })
  .refine((p) => p.endsOn > p.startsOn, {
    message: "The pilot has to end after it starts.",
    path: ["endsOn"],
  });

/**
 * Free pilot for part of campus (Phase 9). While it runs, only students in the chosen
 * residential colleges are matched and counted. No billing.
 */
export async function savePilotConfig(raw: z.input<typeof pilotInput>): Promise<ActionResult> {
  const parsed = pilotInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const p = parsed.data;
  const actorId = await housingAdmin(p.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  if (p.residentialColleges.length) {
    const { data: known } = await db
      .from("school_options")
      .select("value")
      .eq("school_id", p.schoolId)
      .eq("kind", "residential_college")
      .in("value", p.residentialColleges);
    if ((known ?? []).length !== new Set(p.residentialColleges).size)
      return fail("Pick residential colleges from your list.");
  }
  const { error } = await db.from("pilot_configs").upsert(
    {
      school_id: p.schoolId,
      scope: {
        residential_colleges: [...new Set(p.residentialColleges)],
      } as unknown as NonNullable<Json>,
      starts_on: p.startsOn,
      ends_on: p.endsOn,
      success_metrics: p.metrics as unknown as NonNullable<Json>,
      updated_by: actorId,
    },
    { onConflict: "school_id" },
  );
  if (error) return fail("Couldn't save the pilot.");
  await logAudit({
    actorId,
    schoolId: p.schoolId,
    action: "pilot_config_saved",
    entity: "pilot_config",
    meta: { residentialColleges: p.residentialColleges, startsOn: p.startsOn, endsOn: p.endsOn },
  });
  runInBackground("school-recompute", () => recomputeSchool(p.schoolId));
  revalidatePath("/staff", "layout");
  return ok();
}

export async function endPilot(school: string): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success) return fail("That school isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { error } = await createAdminClient()
    .from("pilot_configs")
    .delete()
    .eq("school_id", school);
  if (error) return fail("Couldn't end the pilot.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "pilot_config_removed",
    entity: "pilot_config",
  });
  runInBackground("school-recompute", () => recomputeSchool(school));
  revalidatePath("/staff", "layout");
  return ok();
}

const cohortInput = z.object({
  schoolId,
  id: z.string().uuid().optional(),
  name: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(1, "Name the group.").max(80)),
  arm: z.enum(["rumi", "control"]),
  termId: z.string().uuid().nullable(),
  residentialColleges: z.array(code).max(40),
  buildings: z
    .array(
      z
        .string()
        .transform((v) => cleanText(v, { multiline: false }))
        .pipe(z.string().min(1).max(80)),
    )
    .max(60),
});

/** A/B arms for the outcomes report (Phase 6): which residential colleges or buildings are in each. */
export async function savePilotCohort(raw: z.input<typeof cohortInput>): Promise<ActionResult> {
  const parsed = cohortInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const c = parsed.data;
  if (!c.residentialColleges.length && !c.buildings.length)
    return fail("Add at least one residential college or building.");
  const actorId = await housingAdmin(c.schoolId);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  if (c.termId) {
    const { data: term } = await db
      .from("terms")
      .select("id")
      .eq("id", c.termId)
      .eq("school_id", c.schoolId)
      .maybeSingle();
    if (!term) return fail("Pick one of your terms.");
  }
  const row = {
    school_id: c.schoolId,
    name: c.name,
    arm: c.arm,
    term_id: c.termId,
    rule: {
      residential_colleges: [...new Set(c.residentialColleges)],
      buildings: [...new Set(c.buildings)],
    } as unknown as NonNullable<Json>,
  };
  const { error } = c.id
    ? await db.from("pilot_cohorts").update(row).eq("id", c.id).eq("school_id", c.schoolId)
    : await db.from("pilot_cohorts").insert({ ...row, created_by: actorId });
  if (error) return fail("Couldn't save the group.");
  await logAudit({
    actorId,
    schoolId: c.schoolId,
    action: c.id ? "pilot_cohort_updated" : "pilot_cohort_added",
    entity: "pilot_cohort",
    entityId: c.id ?? null,
    meta: { name: c.name, arm: c.arm },
  });
  revalidatePath("/staff/settings/plan");
  revalidatePath("/staff/outcomes");
  return ok();
}

export async function deletePilotCohort(school: string, id: string): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || !z.string().uuid().safeParse(id).success)
    return fail("That group isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { error } = await createAdminClient()
    .from("pilot_cohorts")
    .delete()
    .eq("id", id)
    .eq("school_id", school);
  if (error) return fail("Couldn't remove the group.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "pilot_cohort_removed",
    entity: "pilot_cohort",
    entityId: id,
  });
  revalidatePath("/staff/settings/plan");
  revalidatePath("/staff/outcomes");
  return ok();
}
