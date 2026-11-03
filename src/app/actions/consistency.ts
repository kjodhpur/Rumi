"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";

const ruleKeySchema = z.string().min(3).max(64);

export async function dismissConsistencyFlag(ruleKey: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!ruleKeySchema.safeParse(ruleKey).success) return fail("Invalid flag.");

  const supabase = createClient();
  const { error } = await supabase.from("preference_flags").upsert(
    {
      user_id: user.id,
      rule_key: ruleKey,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,rule_key" },
  );

  if (error) return fail("Couldn't dismiss guidance: " + error.message);
  revalidatePath("/settings/profile");
  return ok();
}
