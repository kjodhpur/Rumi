"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { FRICTION_TAGS, carryForwardReady } from "@/lib/retention/rematch";
import { loadSurveyContext } from "@/lib/retention/survey";
import { notifyInApp } from "@/lib/notifications/notify";

const surveyInput = z.object({
  roomAgain: z.enum(["yes", "maybe", "no"]),
  score: z.number().int().min(1).max(5),
  frictionTags: z.array(z.enum(FRICTION_TAGS)).max(3),
  biggestWin: z.string().max(300).optional(),
});

/** The four-question "room again?" survey for the active term. Answers stay the student's. */
export async function submitOutcomeSurvey(raw: z.input<typeof surveyInput>): Promise<ActionResult> {
  const parsed = surveyInput.safeParse(raw);
  if (!parsed.success) return fail("Answer the first two questions.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`survey:${user.id}`, LIMITS.surveyAnswersPerHour))) return fail("Too many changes. Try again in a bit.");

  const context = await loadSurveyContext(user.id);
  if (!context.term || !context.open) return fail("The survey isn't open right now.");
  const db = createAdminClient();
  const { data: me } = await db.from("profiles").select("school_id, is_staff").eq("id", user.id).maybeSingle();
  if (!me || me.is_staff) return fail("Only students take the survey.");
  const { error } = await db.from("outcome_surveys").upsert(
    {
      user_id: user.id,
      school_id: me.school_id,
      term_id: context.term.id,
      group_id: context.group?.id ?? null,
      room_again: parsed.data.roomAgain,
      score: parsed.data.score,
      friction_tags: [...new Set(parsed.data.frictionTags)],
      biggest_win: parsed.data.biggestWin ? cleanText(parsed.data.biggestWin) || null : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,term_id" },
  );
  if (error) return fail("Couldn't save your answers.");
  revalidatePath("/survey");
  return ok();
}

/**
 * "Keep your group?" for the new term. When everyone staying taps keep, the group becomes a
 * pairing for the new term (dealbreakers re-checked); anyone leaving is told they can leave
 * the group, which opens space for others.
 */
export async function answerCarryForward(groupId: string, keep: boolean): Promise<ActionResult<{ carried: boolean }>> {
  if (!z.string().uuid().safeParse(groupId).success || typeof keep !== "boolean") return fail("That group isn't available.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`carry:${user.id}`, LIMITS.carryForwardPerHour))) return fail("Too many changes. Try again in a bit.");

  const context = await loadSurveyContext(user.id);
  const cf = context.carryForward;
  if (!cf || !context.term || context.group?.id !== groupId || !cf.eligible) return fail("Your group can't be carried forward right now.");
  if (!cf.carries.includes(user.id)) return fail("You said you wouldn't room together again, so this is for the others.");

  const db = createAdminClient();
  const { error } = await db
    .from("group_carry_forwards")
    .upsert({ group_id: groupId, term_id: context.term.id, user_id: user.id, keep, answered_at: new Date().toISOString() }, { onConflict: "group_id,term_id,user_id" });
  if (error) return fail("Couldn't save that.");

  const keeps = { ...cf.keeps, [user.id]: keep };
  let carried = false;
  if (carryForwardReady(cf.carries, keeps)) {
    // Re-check dealbreakers and school rules: every pair needs a live mutual score.
    const { data: scores } = await db.from("match_scores").select("viewer_id, candidate_id").in("viewer_id", cf.carries).in("candidate_id", cf.carries);
    const pairs = cf.carries.length * (cf.carries.length - 1);
    const clean = (scores ?? []).length >= pairs;
    const { data: me } = await db.from("profiles").select("school_id").eq("id", user.id).maybeSingle();
    await db.from("pairings").upsert(
      {
        school_id: me!.school_id,
        group_id: groupId,
        member_ids: cf.carries,
        term_id: context.term.id,
        carried_from_term: cf.fromTermId,
        status: clean ? "unreviewed" : "needs_review",
        staff_notes: `Carried forward from ${cf.fromTermName}.${clean ? "" : " A dealbreaker or school rule now applies to one pair."}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" },
    );
    carried = true;
    await notifyInApp([
      ...cf.carries.map((id) => ({ userId: id, type: "carry_forward" as const, entityId: groupId, title: `${context.group!.name} carries into ${cf.toTermName}`, body: "Your housing office sees your group as a confirmed pairing.", href: `/groups/${groupId}` })),
      ...cf.leaving.map((id) => ({ userId: id, type: "carry_forward" as const, entityId: groupId, title: `${context.group!.name} is carrying forward without you`, body: "Leave the group when you're ready, and matching picks up with your answers prefilled.", href: `/groups/${groupId}` })),
    ]);
  }
  revalidatePath("/survey");
  revalidatePath(`/groups/${groupId}`);
  return ok({ carried });
}
