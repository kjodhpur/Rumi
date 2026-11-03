"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import type { SchoolRuleType, SchoolRule } from "@/lib/matching/types";
import type { Json } from "@/types/database";

export async function setSchoolRule(
  schoolId: string,
  ruleType: SchoolRuleType,
  active: boolean,
  params: Record<string, unknown> = {},
): Promise<ActionResult> {
  const actorId = await assertRole(schoolId, "configureTerm");
  if (!actorId) return fail("Unauthorized. Housing Admin role required to configure school rules.");

  const supabase = createClient();
  const { error } = await supabase.from("school_rules").upsert(
    {
      school_id: schoolId,
      rule_type: ruleType,
      active,
      params: params as unknown as Json,
    },
    { onConflict: "school_id, rule_type" },
  );

  if (error) return fail(error.message);

  await logAudit({
    actorId,
    schoolId,
    action: "updated_school_rule",
    entity: "school_rules",
    meta: { ruleType, active, params: params as unknown as Json },
  });

  revalidatePath("/staff/settings/term");
  revalidatePath("/staff/pairings/auto");
  return ok();
}

export async function listSchoolRules(
  schoolId: string,
): Promise<ActionResult<SchoolRule[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("school_rules")
    .select("rule_type, active, params")
    .eq("school_id", schoolId);

  if (error) return fail(error.message);

  const rules: SchoolRule[] = (data ?? []).map((r) => ({
    type: r.rule_type as SchoolRuleType,
    active: r.active,
    params: (r.params as Record<string, unknown>) ?? {},
  }));

  return ok(rules);
}
