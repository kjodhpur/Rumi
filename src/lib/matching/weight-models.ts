import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { buildOutcomeRecords } from "./outcome-data";
import { fitOutcomeWeights, type FitResult } from "./weights-optimizer";

/**
 * Fits a school's outcome model from consented, ended-term outcomes and stores it as a
 * *suggestion*. Nothing changes for students until a housing admin adopts it.
 */
export async function fitAndSuggest(
  schoolId: string,
  options: { lambda?: number; save?: boolean } = {},
): Promise<{ fit: FitResult; modelId: string | null }> {
  const { records, termIds } = await buildOutcomeRecords(schoolId);
  const fit = fitOutcomeWeights(records, options.lambda ?? 1);
  if (fit.status !== "ok" || options.save === false) return { fit, modelId: null };
  const db = createAdminClient();
  // An older suggestion is replaced; an adopted model stays until the admin changes it.
  await db
    .from("weight_models")
    .update({ status: "retired" })
    .eq("school_id", schoolId)
    .eq("status", "suggested");
  const { data, error } = await db
    .from("weight_models")
    .insert({
      school_id: schoolId,
      trained_on_terms: termIds,
      coefficients: Object.fromEntries(
        fit.estimates.map((e) => [
          e.factor,
          { coef: e.coef, se: e.se, low: e.low, high: e.high, evidence: e.evidence },
        ]),
      ) as unknown as NonNullable<Json>,
      metrics: {
        rows: fit.rows,
        positives: fit.positives,
        auc: fit.auc,
        lambda: fit.lambda,
        intercept: fit.intercept,
        iterations: fit.iterations,
      } as unknown as NonNullable<Json>,
      suggested_weights: fit.suggestedWeights as unknown as NonNullable<Json>,
      status: "suggested",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Couldn't save the model: ${error.message}`);
  return { fit, modelId: data.id };
}
