import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchMany } from "@/lib/notifications/dispatch";
import { campusToday } from "@/lib/retention/survey";
import { checkinDueDates } from "./schedule";

/**
 * Nightly living-together reminders (Phases 4.3 and 5):
 * - imported assignments get the school's check-in schedule (self-reported ones get it at move-in);
 * - check-ins due today get one reminder: self-reported always, imported only with the
 *   student's check-ins consent, since they never asked for them;
 * - chores due today get one gentle reminder to whoever's turn it is.
 */
export async function runLivingReminders() {
  const db = createAdminClient();
  const today = campusToday();
  let scheduled = 0;

  const { data: unscheduled } = await db
    .from("assignments")
    .select("id, user_id, school_id, term_id, moved_in_at, source, checkins(id)")
    .is("closed_at", null)
    .neq("source", "self_report")
    .lte("moved_in_at", today)
    .limit(2000);
  const needs = (unscheduled ?? []).filter(
    (a) => !(a.checkins as unknown as { id: string }[]).length,
  );
  if (needs.length) {
    const schools = [...new Set(needs.map((a) => a.school_id))];
    const [{ data: schedules }, { data: terms }] = await Promise.all([
      db
        .from("checkin_schedules")
        .select("school_id, offsets_days, monthly_after")
        .in("school_id", schools),
      db.from("terms").select("id, ends_on").in("school_id", schools),
    ]);
    for (const a of needs) {
      const s = schedules?.find((x) => x.school_id === a.school_id);
      const term = terms?.find((t) => t.id === a.term_id);
      const dates = checkinDueDates(a.moved_in_at, {
        offsets: s?.offsets_days,
        monthlyAfter: s?.monthly_after,
        until: term?.ends_on ?? null,
      });
      if (!dates.length) continue;
      const { error } = await db.from("checkins").upsert(
        dates.map((due) => ({
          assignment_id: a.id,
          user_id: a.user_id,
          term_id: a.term_id,
          due_on: due,
        })),
        { onConflict: "assignment_id,due_on", ignoreDuplicates: true },
      );
      if (!error) scheduled += 1;
    }
  }

  const { data: due } = await db
    .from("checkins")
    .select("id, user_id, assignments!inner(source, closed_at)")
    .eq("due_on", today)
    .is("submitted_at", null)
    .is("assignments.closed_at", null)
    .limit(5000);
  const checkinTargets: { id: string; userId: string }[] = [];
  for (const c of due ?? []) {
    const source = (c.assignments as unknown as { source: string }).source;
    if (source !== "self_report") {
      const { data: consented } = await db.rpc("has_consent", {
        p_uid: c.user_id,
        p_kind: "checkins",
      });
      if (consented !== true) continue;
    }
    checkinTargets.push({ id: c.id, userId: c.user_id });
  }
  await dispatchMany(
    "checkins",
    checkinTargets.map((c) => ({
      userId: c.userId,
      type: "checkin_due",
      entityId: c.id,
      title: "How's living together going?",
      body: "Three taps. Your answers stay private unless you choose to share them.",
      href: "/check-in",
    })),
  );

  const { data: chores } = await db
    .from("chore_instances")
    .select("id, group_id, assignee_id, chores!inner(title)")
    .eq("due_on", today)
    .is("completed_at", null)
    .is("reminded_at", null)
    .limit(5000);
  await dispatchMany(
    "groups",
    (chores ?? []).map((c) => ({
      userId: c.assignee_id,
      type: "chore_due",
      entityId: c.id,
      title: `Your turn: ${(c.chores as unknown as { title: string }).title}`,
      body: "Check it off in your room home when it's done.",
      href: `/groups/${c.group_id}/home`,
    })),
  );
  if (chores?.length)
    await db
      .from("chore_instances")
      .update({ reminded_at: new Date().toISOString() })
      .in(
        "id",
        chores.map((c) => c.id),
      );

  return {
    scheduled,
    checkinReminders: checkinTargets.length,
    choreReminders: chores?.length ?? 0,
  };
}
