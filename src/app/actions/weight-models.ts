"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";

export async function adoptWeightModel(
  schoolId: string,
  modelId: string,
): Promise<ActionResult> {
  const actorId = await assertRole(schoolId, "configureTerm");
  if (!actorId) return fail("Unauthorized. Housing Admin role required to adopt weight models.");

  const supabase = createClient();

  // 1. Retire any currently adopted model
  await supabase
    .from("weight_models")
    .update({ status: "retired" })
    .eq("school_id", schoolId)
    .eq("status", "adopted");

  // 2. Mark this model as adopted
  const { data: model, error } = await supabase
    .from("weight_models")
    .update({
      status: "adopted",
      adopted_by: actorId,
      adopted_at: new Date().toISOString(),
    })
    .eq("id", modelId)
    .eq("school_id", schoolId)
    .select("coefficients")
    .single();

  if (error || !model) return fail(error?.message ?? "Failed to adopt weight model.");

  await logAudit({
    actorId,
    schoolId,
    action: "adopted_weight_model",
    entity: "weight_models",
    meta: { modelId, coefficients: model.coefficients },
  });

  revalidatePath("/staff/settings/term");
  return ok();
}

export async function listWeightModels(schoolId: string) {
  const actorId = await assertRole(schoolId, "viewDashboard");
  if (!actorId) return fail("Unauthorized. Staff access required.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_models")
    .select("id, status, coefficients, metrics, adopted_at, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message);
  return ok(data ?? []);
}
