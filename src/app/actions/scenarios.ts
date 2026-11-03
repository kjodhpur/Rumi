"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { runInBackground } from "@/lib/background";
import { loadActiveQuestions } from "@/lib/matching/questions";
import { recomputeMatchesFor } from "@/lib/matching/recompute";

const answerInput = z.object({
  questionKey: z.string().regex(/^[a-z0-9_]{3,40}$/),
  choiceKey: z.string().regex(/^[a-z0-9_]{1,40}$/).nullable(),
});

/**
 * Saves (or clears) one scenario / school question answer, then re-ranks in the background.
 * Only questions live for the student's school, at their current version, are accepted.
 */
export async function saveScenarioAnswer(raw: z.input<typeof answerInput>): Promise<ActionResult> {
  const parsed = answerInput.safeParse(raw);
  if (!parsed.success) return fail("Pick one of the answers.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`scenario:${user.id}`, LIMITS.scenarioAnswersPerHour))) return fail("Too many changes. Try again in a bit.");

  const supabase = createClient();
  const { data: me } = await supabase.from("profiles").select("school_id, is_staff").eq("id", user.id).maybeSingle();
  if (!me || me.is_staff) return fail("Only students answer these.");
  const question = (await loadActiveQuestions(me.school_id)).find((q) => q.key === parsed.data.questionKey);
  if (!question) return fail("That question isn't available anymore.");

  const { choiceKey } = parsed.data;
  if (choiceKey === null) {
    const { error } = await supabase.from("school_question_answers").delete().eq("user_id", user.id).eq("question_key", question.key);
    if (error) return fail("Couldn't clear that answer.");
  } else {
    if (!question.choices.some((c) => c.key === choiceKey)) return fail("Pick one of the answers.");
    const { error } = await supabase.from("school_question_answers").upsert(
      { user_id: user.id, question_key: question.key, question_version: question.version, choice_key: choiceKey, updated_at: new Date().toISOString() },
      { onConflict: "user_id,question_key" },
    );
    if (error) return fail("Couldn't save that answer.");
  }
  runInBackground("scenario-recompute", () => recomputeMatchesFor(user.id));
  revalidatePath("/settings/scenarios");
  return ok();
}
