import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { FACTORS, type FactorKey, type Importance } from "@/lib/options";

/**
 * The school's default importance per factor from an adopted outcome-trained model (1.G),
 * or nothing. It only fills factors a student hasn't set; their own choices always win.
 */
export async function loadSchoolDefaultWeights(
  schoolId: string,
): Promise<Partial<Record<FactorKey, Importance>>> {
  const { data } = await createAdminClient()
    .from("weight_models")
    .select("suggested_weights")
    .eq("school_id", schoolId)
    .eq("status", "adopted")
    .maybeSingle();
  const raw =
    data?.suggested_weights &&
    typeof data.suggested_weights === "object" &&
    !Array.isArray(data.suggested_weights)
      ? (data.suggested_weights as Record<string, unknown>)
      : {};
  const out: Partial<Record<FactorKey, Importance>> = {};
  for (const f of FACTORS) {
    const v = raw[f];
    if (v === 0 || v === 1 || v === 2) out[f] = v;
  }
  return out;
}
