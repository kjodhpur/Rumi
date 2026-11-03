"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { CHECKIN_TAGS, assessRisk, crisisSignal, type CheckinTag } from "@/lib/retention/risk";

const building = z.string().trim().min(1, "Add the building.").max(80);
const room = z.string().trim().max(40).optional();

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
}

async function student() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().from("profiles").select("id, school_id, is_staff").eq("id", user.id).maybeSingle();
  if (!data || data.is_staff) return null;
  return data;
}

/** Self-reported move-in. Closes any open assignment and schedules week 2, 4 and 8. */
export async function reportMoveIn(input: { building: string; room?: string }): Promise<ActionResult> {
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  const parsed = z.object({ building, room }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the building and room.");
  if (!(await rateLimit(`checkin:${who.id}`, LIMITS.checkinsPerDay))) return fail("Too many updates. Try again tomorrow.");

  const db = createAdminClient();
  const movedIn = today();
  await db.from("assignments").update({ closed_at: new Date().toISOString() }).eq("user_id", who.id).is("closed_at", null);
  const { data: assignment, error } = await db
    .from("assignments")
    .insert({
      user_id: who.id,
      school_id: who.school_id,
      building: parsed.data.building,
      room: parsed.data.room || null,
      moved_in_at: movedIn,
    })
    .select("id")
    .single();
  if (error || !assignment) return fail("Couldn't save the move-in.");
  const { error: checkinError } = await db.from("checkins").insert(
    [14, 28, 56].map((days) => ({
      assignment_id: assignment.id,
      user_id: who.id,
      due_on: addDays(movedIn, days),
    })),
  );
  if (checkinError) return fail("Couldn't schedule the check-ins.");
  revalidatePath("/check-in");
  return ok();
}

const submitInput = z.object({
  score: z.number().int().min(1).max(5),
  tags: z.array(z.enum(CHECKIN_TAGS)).max(2),
  note: z.string().max(1000).optional(),
  shareWithRa: z.boolean(),
  askRa: z.boolean(),
});

/** Submits the next pulse, even if its due date is still ahead, and records the risk. */
export async function submitCheckin(raw: z.input<typeof submitInput>): Promise<ActionResult<{ level: "low" | "medium" | "high"; reasons: string[]; crisis: boolean }>> {
  const parsed = submitInput.safeParse(raw);
  if (!parsed.success) return fail("Pick a score from 1 to 5 and at most two tags.");
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  if (!(await rateLimit(`checkin:${who.id}`, LIMITS.checkinsPerDay))) return fail("Too many updates. Try again tomorrow.");

  const db = createAdminClient();
  const { data: assignment } = await db
    .from("assignments")
    .select("id, school_id, building, room")
    .eq("user_id", who.id)
    .is("closed_at", null)
    .maybeSingle();
  if (!assignment) return fail("Tell us you've moved in first.");

  const { data: open } = await db
    .from("checkins")
    .select("id, due_on")
    .eq("assignment_id", assignment.id)
    .is("submitted_at", null)
    .order("due_on")
    .limit(1)
    .maybeSingle();

  const note = parsed.data.note ? cleanText(parsed.data.note) : null;
  const crisis = note ? crisisSignal(note) : false;
  const submittedAt = new Date().toISOString();
  const row = {
    score: parsed.data.score,
    tags: parsed.data.tags,
    note,
    share_with_ra: parsed.data.shareWithRa || parsed.data.askRa,
    ask_ra: parsed.data.askRa,
    crisis,
    submitted_at: submittedAt,
  };

  if (open) {
    const { error } = await db.from("checkins").update(row).eq("id", open.id);
    if (error) return fail("Couldn't save the check-in.");
  } else {
    const { data: created, error } = await db
      .from("checkins")
      .insert({ assignment_id: assignment.id, user_id: who.id, due_on: today(), ...row })
      .select("id")
      .single();
    if (error || !created) return fail("Couldn't save the check-in.");
  }

  const { data: history } = await db
    .from("checkins")
    .select("score, tags, submitted_at")
    .eq("assignment_id", assignment.id)
    .not("submitted_at", "is", null)
    .order("submitted_at");

  let roommateScores: number[] = [];
  let watchouts: string[] = [];
  if (assignment.room) {
    const { data: mates } = await db
      .from("assignments")
      .select("user_id")
      .eq("school_id", assignment.school_id)
      .eq("building", assignment.building)
      .eq("room", assignment.room)
      .is("closed_at", null)
      .neq("user_id", who.id);
    const mateIds = (mates ?? []).map((mate) => mate.user_id);
    if (mateIds.length) {
      const [{ data: theirs }, { data: scores }] = await Promise.all([
        db.from("checkins").select("user_id, score, submitted_at").in("user_id", mateIds).not("submitted_at", "is", null).order("submitted_at"),
        db.from("match_scores").select("watchouts").eq("viewer_id", who.id).in("candidate_id", mateIds),
      ]);
      const latest = new Map<string, number>();
      for (const row of theirs ?? []) if (row.score !== null) latest.set(row.user_id, row.score);
      roommateScores = [...latest.values()];
      watchouts = (scores ?? []).flatMap((score) =>
        Array.isArray(score.watchouts)
          ? (score.watchouts as { key?: string }[]).map((item) => item.key).filter((key): key is string => Boolean(key))
          : [],
      );
    }
  }

  const assessment = assessRisk({
    checkins: (history ?? []).filter((item) => item.score !== null).map((item) => ({ score: item.score!, tags: item.tags })),
    roommateScores,
    watchouts,
  });
  await db.from("risk_events").insert({
    user_id: who.id,
    assignment_id: assignment.id,
    level: assessment.level,
    reasons: assessment.reasons,
  });
  revalidatePath("/check-in");
  revalidatePath("/staff/ra");
  return ok({ level: assessment.level, reasons: assessment.reasons, crisis });
}

export type { CheckinTag };
