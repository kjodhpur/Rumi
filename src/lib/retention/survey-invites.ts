import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchMany } from "@/lib/notifications/dispatch";
import { shouldInvite } from "./rematch";
import { campusToday } from "./survey";

/**
 * Nightly: three weeks before a term ends, invite every student in a group or with an
 * assignment to the end-of-term survey. One invite per student per term.
 */
export async function sendSurveyInvites() {
  const db = createAdminClient();
  const today = campusToday();
  const { data: terms } = await db
    .from("terms")
    .select("id, school_id, name, ends_on")
    .eq("active", true);
  let invited = 0;
  for (const term of terms ?? []) {
    if (!shouldInvite(term.ends_on, today)) continue;
    const [{ data: grouped }, { data: assigned }, { data: sent }] = await Promise.all([
      db
        .from("group_members")
        .select("user_id, groups!inner(school_id)")
        .eq("groups.school_id", term.school_id),
      db
        .from("assignments")
        .select("user_id")
        .eq("school_id", term.school_id)
        .is("closed_at", null),
      db.from("outcome_survey_sends").select("user_id").eq("term_id", term.id),
    ]);
    const already = new Set((sent ?? []).map((s) => s.user_id));
    const targets = [
      ...new Set([
        ...(grouped ?? []).map((g) => g.user_id),
        ...(assigned ?? []).map((a) => a.user_id),
      ]),
    ].filter((id) => !already.has(id));
    if (!targets.length) continue;
    const { error } = await db
      .from("outcome_survey_sends")
      .insert(targets.map((user_id) => ({ user_id, term_id: term.id })));
    if (error) continue;
    await dispatchMany(
      "checkins",
      targets.map((userId) => ({
        userId,
        type: "survey",
        entityId: term.id,
        title: `${term.name} is almost over`,
        body: "Four quick questions: would you room together again?",
        href: "/survey",
      })),
    );
    invited += targets.length;
  }
  return { invited };
}
