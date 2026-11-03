"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";

export async function saveScenarioAnswer(
  questionId: string,
  choiceKey: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!questionId || !choiceKey) return fail("Missing question or choice.");

  const supabase = createClient();

  const { error } = await supabase.from("school_question_answers").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      choice_key: choiceKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" },
  );

  if (error) return fail(error.message);

  revalidatePath("/matches");
  revalidatePath("/settings/profile");
  return ok();
}

export async function loadUserScenarioAnswers(): Promise<
  ActionResult<{ answers: Record<string, string> }>
> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("school_question_answers")
    .select("question_id, choice_key")
    .eq("user_id", user.id);

  if (error) return fail(error.message);

  const answers: Record<string, string> = {};
  for (const row of data || []) {
    answers[row.question_id] = row.choice_key;
  }

  return ok({ answers });
}
