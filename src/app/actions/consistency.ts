"use server";

import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { CONSISTENCY_RULES } from "@/lib/matching/consistency";

const input = z.object({
  ruleKey: z.enum(CONSISTENCY_RULES.map((r) => r.key) as [string, ...string[]]),
  signature: z.string().max(200),
});

/** Hides a consistency prompt until one of the answers it looked at changes (1.D). */
export async function dismissConsistencyFlag(raw: z.input<typeof input>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail("Couldn't dismiss that.");
  if (!(await rateLimit(`pref-flags:${user.id}`, LIMITS.preferenceFlagsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient()
    .from("preference_flags")
    .upsert(
      {
        user_id: user.id,
        rule_key: parsed.data.ruleKey,
        answers_sig: parsed.data.signature,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,rule_key" },
    );
  if (error) return fail("Couldn't dismiss that. Try again.");
  return ok();
}
