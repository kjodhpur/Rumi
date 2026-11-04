import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAll, selectByIds } from "@/lib/supabase/paginate";
import { pairMismatches, type LifestyleAnswers, type OutcomeRecord } from "./weights-optimizer";

/**
 * Training rows for outcome-trained weights (1.G): one per roommate pair in an approved
 * pairing from a term that has ended, when every member consented to research use
 * (research_outcomes). Friction = any member asked for a room change that term, or said
 * they wouldn't room together again / rated it 2 or lower.
 */
export async function buildOutcomeRecords(
  schoolId: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<{ records: OutcomeRecord[]; termIds: string[] }> {
  const db = createAdminClient();
  const { data: terms } = await db
    .from("terms")
    .select("id, starts_on, ends_on")
    .eq("school_id", schoolId)
    .lt("ends_on", today);
  if (!terms?.length) return { records: [], termIds: [] };
  const termIds = terms.map((t) => t.id);
  const pairings = await selectAll((from, to) =>
    db
      .from("pairings")
      .select("id, group_id, term_id, member_ids")
      .eq("school_id", schoolId)
      .eq("status", "approved")
      .in("term_id", termIds)
      .order("id")
      .range(from, to),
  );
  const members = [...new Set(pairings.flatMap((p) => p.member_ids))];
  if (!members.length) return { records: [], termIds };

  const consented = new Set<string>();
  const prefs = new Map<string, LifestyleAnswers>();
  const changes = new Set<string>();
  const unhappy = new Set<string>();
  const [c, p, rc, sv] = await Promise.all([
    selectByIds(members, (ids, f, t) =>
      db
        .from("consents")
        .select("id, user_id")
        .eq("kind", "research_outcomes")
        .is("revoked_at", null)
        .in("user_id", ids)
        .order("id")
        .range(f, t),
    ),
    selectByIds(members, (ids, f, t) =>
      db
        .from("preferences")
        .select(
          "user_id, sleep_schedule, cleanliness, noise, guests, smoking, drinking, pets, study",
        )
        .in("user_id", ids)
        .order("user_id")
        .range(f, t),
    ),
    selectByIds(members, (ids, f, t) =>
      db
        .from("room_change_requests")
        .select("id, user_id, term_id")
        .eq("school_id", schoolId)
        .in("user_id", ids)
        .in("term_id", termIds)
        .order("id")
        .range(f, t),
    ),
    selectByIds(members, (ids, f, t) =>
      db
        .from("outcome_surveys")
        .select("id, user_id, term_id, room_again, score")
        .eq("school_id", schoolId)
        .in("user_id", ids)
        .in("term_id", termIds)
        .order("id")
        .range(f, t),
    ),
  ]);
  for (const r of c) consented.add(r.user_id);
  for (const r of p)
    prefs.set(r.user_id, {
      sleepSchedule: r.sleep_schedule,
      cleanliness: r.cleanliness,
      noise: r.noise,
      guests: r.guests,
      smoking: r.smoking,
      drinking: r.drinking,
      pets: r.pets,
      study: r.study,
    });
  for (const r of rc) changes.add(`${r.user_id}:${r.term_id}`);
  for (const r of sv)
    if (r.room_again === "no" || r.score <= 2) unhappy.add(`${r.user_id}:${r.term_id}`);

  const records: OutcomeRecord[] = [];
  for (const pairing of pairings) {
    const ids = pairing.member_ids;
    if (ids.length < 2 || !ids.every((id) => consented.has(id) && prefs.has(id))) continue;
    const hadFriction = ids.some(
      (id) => changes.has(`${id}:${pairing.term_id}`) || unhappy.has(`${id}:${pairing.term_id}`),
    );
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        records.push({
          mismatches: pairMismatches(prefs.get(ids[i])!, prefs.get(ids[j])!),
          hadFriction,
        });
  }
  return { records, termIds };
}
