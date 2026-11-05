"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { runInBackground } from "@/lib/background";
import { recomputeSchool } from "@/lib/matching/recompute";
import { fitAndSuggest } from "@/lib/matching/weight-models";
import type { Json } from "@/types/database";

const schoolId = z.string().regex(/^[a-z0-9-]{2,40}$/);
const modelId = z.string().uuid();

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

/** Runs the 1.G analysis on consented outcomes now and stores a suggestion. */
export async function runWeightFit(school: string): Promise<ActionResult<{ rows: number }>> {
  if (!schoolId.safeParse(school).success) return fail("That school isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const { fit, modelId: id } = await fitAndSuggest(school);
  if (fit.status !== "ok") return fail(fit.message);
  await logAudit({
    actorId,
    schoolId: school,
    action: "weight_model_fitted",
    entity: "weight_model",
    entityId: id,
    meta: { rows: fit.rows, auc: fit.auc },
  });
  revalidatePath("/staff/settings/term");
  return ok({ rows: fit.rows });
}

/** A housing admin adopts a suggestion as the school's default weights. Audited; re-ranks everyone. */
export async function adoptWeightModel(school: string, id: string): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || !modelId.safeParse(id).success)
    return fail("That model isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  const { data: model } = await db
    .from("weight_models")
    .select("id, status, suggested_weights")
    .eq("id", id)
    .eq("school_id", school)
    .maybeSingle();
  if (!model || model.status !== "suggested")
    return fail("Only a current suggestion can be adopted.");
  const { data: previous } = await db
    .from("weight_models")
    .select("id, suggested_weights")
    .eq("school_id", school)
    .eq("status", "adopted")
    .maybeSingle();
  if (previous) await db.from("weight_models").update({ status: "retired" }).eq("id", previous.id);
  const { error } = await db
    .from("weight_models")
    .update({ status: "adopted", adopted_by: actorId, adopted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail("Couldn't adopt the model.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "weight_model_adopted",
    entity: "weight_model",
    entityId: id,
    meta: {
      defaults: model.suggested_weights as Json,
      replaced: previous?.id ?? null,
      previousDefaults: (previous?.suggested_weights ?? null) as Json,
    },
  });
  runInBackground("school-recompute", () => recomputeSchool(school));
  revalidatePath("/staff/settings/term");
  return ok();
}

/** Stops using an adopted model (back to Rumi's defaults) or drops a suggestion. */
export async function retireWeightModel(school: string, id: string): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || !modelId.safeParse(id).success)
    return fail("That model isn't available.");
  const actorId = await housingAdmin(school);
  if (!actorId || actorId === "limited") return deny(actorId);
  const db = createAdminClient();
  const { data, error } = await db
    .from("weight_models")
    .update({ status: "retired" })
    .eq("id", id)
    .eq("school_id", school)
    .neq("status", "retired")
    .select("status")
    .maybeSingle();
  if (error || !data) return fail("That model was already retired.");
  await logAudit({
    actorId,
    schoolId: school,
    action: "weight_model_retired",
    entity: "weight_model",
    entityId: id,
  });
  runInBackground("school-recompute", () => recomputeSchool(school));
  revalidatePath("/staff/settings/term");
  return ok();
}
