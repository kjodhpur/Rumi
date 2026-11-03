"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { encrypt } from "@/lib/crypto";
import { CAMPUS_TZ } from "@/lib/time";
import { CHECKIN_TAGS, assessRisk, crisisSignal, threatSignal } from "@/lib/retention/risk";
import { checkinDueDates } from "@/lib/checkins/schedule";
import { notifyInApp } from "@/lib/notifications/notify";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });

async function student() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().from("profiles").select("id, school_id, is_staff").eq("id", user.id).maybeSingle();
  if (!data || data.is_staff) return null;
  return data;
}

const moveInInput = z.object({
  building: z.string().transform((v) => cleanText(v, { multiline: false })).pipe(z.string().min(1, "Add the building.").max(80)),
  room: z.string().transform((v) => cleanText(v, { multiline: false })).pipe(z.string().max(40)).optional(),
});

/** Self-reported move-in. Closes any open assignment and schedules the school's check-ins. */
export async function reportMoveIn(raw: z.input<typeof moveInInput>): Promise<ActionResult> {
  const parsed = moveInInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  if (!(await rateLimit(`checkin:${who.id}`, LIMITS.checkinsPerDay))) return fail("Too many updates. Try again tomorrow.");

  const db = createAdminClient();
  const movedIn = today();
  const [{ data: term }, { data: schedule }] = await Promise.all([
    db.from("terms").select("id, ends_on").eq("school_id", who.school_id).eq("active", true).maybeSingle(),
    db.from("checkin_schedules").select("offsets_days, monthly_after").eq("school_id", who.school_id).maybeSingle(),
  ]);
  await db.from("assignments").update({ closed_at: new Date().toISOString() }).eq("user_id", who.id).is("closed_at", null);
  const { data: assignment, error } = await db
    .from("assignments")
    .insert({ user_id: who.id, school_id: who.school_id, term_id: term?.id ?? null, building: parsed.data.building, room: parsed.data.room || null, moved_in_at: movedIn, source: "self_report" })
    .select("id")
    .single();
  if (error || !assignment) return fail("Couldn't save the move-in.");

  const dates = checkinDueDates(movedIn, { offsets: schedule?.offsets_days, monthlyAfter: schedule?.monthly_after, until: term?.ends_on ?? null });
  if (dates.length) {
    const { error: checkinError } = await db
      .from("checkins")
      .insert(dates.map((due) => ({ assignment_id: assignment.id, user_id: who.id, term_id: term?.id ?? null, due_on: due })));
    if (checkinError) return fail("Couldn't schedule the check-ins.");
  }
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

export interface CheckinOutcome {
  level: "low" | "medium" | "high";
  reasons: string[];
  crisis: boolean;
  threat: boolean;
  raNotified: boolean;
}

/** Submits the next pulse (even ahead of its date) and records the transparent risk read. */
export async function submitCheckin(raw: z.input<typeof submitInput>): Promise<ActionResult<CheckinOutcome>> {
  const parsed = submitInput.safeParse(raw);
  if (!parsed.success) return fail("Pick a score from 1 to 5 and at most two tags.");
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  if (!(await rateLimit(`checkin:${who.id}`, LIMITS.checkinsPerDay))) return fail("Too many updates. Try again tomorrow.");

  const db = createAdminClient();
  const { data: assignment } = await db.from("assignments").select("id, school_id, building, room, term_id").eq("user_id", who.id).is("closed_at", null).maybeSingle();
  if (!assignment) return fail("Tell us you've moved in first.");

  const note = parsed.data.note ? cleanText(parsed.data.note) : "";
  const crisis = note ? crisisSignal(note) : false;
  const threat = note ? threatSignal(note) : false;
  const askRa = parsed.data.askRa;
  const share = parsed.data.shareWithRa || askRa;
  const row = {
    score: parsed.data.score,
    tags: [...new Set(parsed.data.tags)],
    note_enc: note ? encrypt(note) : null,
    share_with_ra: share,
    ask_ra: askRa,
    crisis: crisis || threat,
    submitted_at: new Date().toISOString(),
  };

  const { data: open } = await db.from("checkins").select("id").eq("assignment_id", assignment.id).is("submitted_at", null).order("due_on").limit(1).maybeSingle();
  const saved = open
    ? await db.from("checkins").update(row).eq("id", open.id)
    : await db.from("checkins").insert({ assignment_id: assignment.id, user_id: who.id, term_id: assignment.term_id, due_on: today(), ...row });
  if (saved.error) return fail("Couldn't save the check-in.");

  // Risk: this student's history, their roommates' latest scores, and known watch-outs.
  const { data: history } = await db.from("checkins").select("score, tags").eq("assignment_id", assignment.id).not("submitted_at", "is", null).order("submitted_at");
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
    const mateIds = (mates ?? []).map((m) => m.user_id);
    if (mateIds.length) {
      const [{ data: theirs }, { data: scores }] = await Promise.all([
        db.from("checkins").select("user_id, score, submitted_at").in("user_id", mateIds).not("submitted_at", "is", null).order("submitted_at"),
        db.from("match_scores").select("watchouts").eq("viewer_id", who.id).in("candidate_id", mateIds),
      ]);
      const latest = new Map<string, number>();
      for (const r of theirs ?? []) if (r.score !== null) latest.set(r.user_id, r.score);
      roommateScores = [...latest.values()];
      // Watch-out factor keys that line up with check-in tags (sleep shows up as "schedule").
      const toTag: Record<string, string> = { noise: "noise", guests: "guests", cleanliness: "cleanliness", sleep: "schedule", study: "schedule" };
      watchouts = (scores ?? []).flatMap((s) => (Array.isArray(s.watchouts) ? (s.watchouts as { key?: string }[]).map((w) => (w.key ? toTag[w.key] : undefined)) : [])).filter((k): k is string => Boolean(k));
    }
  }
  const assessment = assessRisk({
    checkins: (history ?? []).filter((h) => h.score !== null).map((h) => ({ score: h.score!, tags: h.tags })),
    roommateScores,
    watchouts,
  });
  await db.from("risk_events").insert({ user_id: who.id, assignment_id: assignment.id, level: assessment.level, reasons: assessment.reasons });

  // RA alert: only with consent + "share with my RA" on a medium/high read, or "ask my RA".
  const { data: consented } = await db.rpc("has_consent", { p_uid: who.id, p_kind: "checkins" });
  const alert = askRa || (share && consented === true && assessment.level !== "low");
  let raNotified = false;
  if (alert) {
    const { data: existing } = await db.from("ra_cases").select("id").eq("assignment_id", assignment.id).eq("status", "open").maybeSingle();
    const caseId =
      existing?.id ??
      (await db.from("ra_cases").insert({ school_id: assignment.school_id, assignment_id: assignment.id, user_id: who.id, building: assignment.building }).select("id").single()).data?.id;
    if (caseId) {
      const { data: staff } = await db.from("staff_members").select("user_id, role, scopes").eq("school_id", assignment.school_id).is("disabled_at", null).in("role", ["ra", "housing_staff", "housing_admin"]);
      const targets = (staff ?? []).filter((s) => {
        if (s.role !== "ra") return false;
        const buildings = (s.scopes as { buildings?: string[] } | null)?.buildings ?? [];
        return buildings.includes(assignment.building);
      });
      // No RA covers the building: housing staff get it instead.
      const recipients = targets.length ? targets : (staff ?? []).filter((s) => s.role !== "ra");
      await notifyInApp(
        recipients.map((s) => ({
          userId: s.user_id,
          type: "ra_followup",
          entityId: caseId,
          title: askRa ? `A student in ${assignment.building} asked for help` : `A check-in in ${assignment.building} needs a look`,
          body: "Open the RA workspace for details.",
          href: "/staff/ra",
        })),
      );
      raNotified = recipients.length > 0;
    }
  }

  // Crisis or threat language: resources for the student and a content-free flag to the
  // Rumi team. The note itself is never shared without consent (docs/phase-5.md, legal review).
  if (crisis || threat) {
    const { data: admins } = await db.from("admins").select("user_id");
    await notifyInApp((admins ?? []).map((a) => ({ userId: a.user_id, type: "safety_notice", entityId: assignment.id, title: "A check-in showed crisis or threat language", body: "Crisis resources were shown to the student. No content is attached.", href: "/admin" })));
    await db.from("moderation_log").insert({ actor_id: null, target_id: who.id, action: crisis ? "checkin_crisis_flag" : "checkin_threat_flag", meta: { assignment_id: assignment.id } });
  }

  revalidatePath("/check-in");
  revalidatePath("/staff/ra");
  return ok({ level: assessment.level, reasons: assessment.reasons, crisis, threat, raNotified });
}

const changeInput = z.object({
  reasonKeys: z.array(z.string().regex(/^[a-z_]{2,30}$/)).min(1, "Pick at least one reason.").max(3),
  note: z.string().max(500).optional(),
});

/** Ask for a room change. Staff see the reasons in aggregate; RAs see it with the case. */
export async function requestRoomChange(raw: z.input<typeof changeInput>): Promise<ActionResult> {
  const parsed = changeInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  if (!(await rateLimit(`room-change:${who.id}`, LIMITS.roomChangeRequestsPerDay))) return fail("You've already asked today.");

  const db = createAdminClient();
  const { data: assignment } = await db.from("assignments").select("id, school_id, building, room, term_id").eq("user_id", who.id).is("closed_at", null).maybeSingle();
  if (!assignment) return fail("Tell us where you live first.");
  const { data: reasons } = await db.from("room_change_reasons").select("key").eq("school_id", assignment.school_id).eq("active", true);
  const allowed = new Set((reasons ?? []).map((r) => r.key));
  const keys = [...new Set(parsed.data.reasonKeys)].filter((k) => allowed.has(k));
  if (!keys.length) return fail("Pick at least one reason.");

  // The match score with current roommates, and whether the room signed an agreement.
  let score: number | null = null;
  if (assignment.room) {
    const { data: mates } = await db.from("assignments").select("user_id").eq("school_id", assignment.school_id).eq("building", assignment.building).eq("room", assignment.room).is("closed_at", null).neq("user_id", who.id);
    const ids = (mates ?? []).map((m) => m.user_id);
    if (ids.length) {
      const { data: scores } = await db.from("match_scores").select("score").eq("viewer_id", who.id).in("candidate_id", ids);
      score = scores?.length ? Math.max(...scores.map((s) => s.score)) : null;
    }
  }
  const { data: membership } = await db.from("group_members").select("group_id").eq("user_id", who.id).maybeSingle();
  const { data: agreement } = membership ? await db.from("agreements").select("status").eq("group_id", membership.group_id).maybeSingle() : { data: null };

  const { error } = await db.from("room_change_requests").insert({
    school_id: assignment.school_id,
    user_id: who.id,
    assignment_id: assignment.id,
    term_id: assignment.term_id,
    building: assignment.building,
    reason_keys: keys,
    student_note: parsed.data.note ? cleanText(parsed.data.note) : null,
    match_score_at_assignment: score,
    agreement_signed: agreement ? agreement.status === "signed" : null,
    source: "in_app",
  });
  if (error) return fail(error.code === "23505" ? "You already have an open request." : "Couldn't send the request.");
  revalidatePath("/check-in");
  return ok();
}

export async function withdrawRoomChange(): Promise<ActionResult> {
  const who = await student();
  if (!who) return fail("Sign in as a student to do that.");
  const db = createAdminClient();
  await db.from("swap_pool").delete().eq("user_id", who.id);
  const { error } = await db.from("room_change_requests").update({ status: "withdrawn", closed_at: new Date().toISOString() }).eq("user_id", who.id).eq("status", "open");
  if (error) return fail("Couldn't withdraw the request.");
  revalidatePath("/check-in");
  return ok();
}
