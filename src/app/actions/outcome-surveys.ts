"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { evaluateRematchEligibility, type SurveyResponse } from "@/lib/retention/rematch";

export async function submitOutcomeSurvey(
  termId: string,
  groupId: string | null,
  roomAgain: "yes" | "maybe" | "no",
  score: number,
  tags: string[] = [],
  biggestWin?: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  if (score < 1 || score > 5) {
    return fail("Rating must be between 1 and 5.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("outcome_surveys").upsert(
    {
      user_id: user.id,
      term_id: termId || null,
      group_id: groupId || null,
      room_again: roomAgain,
      score: Math.round(score),
      tags,
      biggest_win: biggestWin?.slice(0, 500) || null,
    },
    { onConflict: "user_id, term_id" },
  );

  if (error) return fail(error.message);

  revalidatePath("/groups");
  return ok();
}

export async function checkGroupRematch(
  groupId: string,
  termId: string,
): Promise<ActionResult<{ eligible: boolean; carries: string[]; leaving: string[]; reason: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const { data: surveys, error } = await supabase
    .from("outcome_surveys")
    .select("user_id, room_again, score")
    .eq("group_id", groupId)
    .eq("term_id", termId);

  if (error) return fail(error.message);

  const responses: SurveyResponse[] = (surveys ?? []).map((s) => ({
    userId: s.user_id,
    roomAgain: s.room_again as "yes" | "maybe" | "no",
    score: s.score,
  }));

  const result = evaluateRematchEligibility(responses);
  return ok(result);
}
