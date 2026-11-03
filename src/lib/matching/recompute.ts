import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import type { FactorKey, Importance } from "@/lib/options";
import { evaluateMatch, STRONG_MATCH_THRESHOLD, type PoolContext } from "./engine";
import { isAccommodationKey } from "./accommodations";
import { loadActiveQuestions } from "./questions";
import { toScenarioAnswers } from "./scenarios";
import type { AccommodationConstraintKey, MatchEvaluation, MatchProfile, ScenarioAnswer, SchoolRuleType, Track } from "./types";

type PrefsRow = Database["public"]["Tables"]["preferences"]["Row"];
type MusicRow = Database["public"]["Tables"]["music_profiles"]["Row"];
type ScoreInsert = Database["public"]["Tables"]["match_scores"]["Insert"];

interface PoolRow {
  id: string;
  first_name: string;
  gender: string | null;
  track: string | null;
  pre_arrival: boolean;
  admit_term_id: string | null;
  academic_college: string | null;
  residential_college: string | null;
  llc: string | null;
  is_hidden: boolean;
  preferences: PrefsRow | null;
  music_profiles: MusicRow | null;
}

const CHUNK = 400;

export interface ProfileExtras {
  accommodations?: AccommodationConstraintKey[];
  scenarios?: Record<string, ScenarioAnswer>;
  classDay?: MatchProfile["classDay"];
}

export function toMatchProfile(
  profile: Omit<PoolRow, "preferences" | "music_profiles" | "is_hidden">,
  prefs: PrefsRow,
  music?: MusicRow | null,
  extras: ProfileExtras = {},
): MatchProfile {
  const artists = Array.isArray(music?.top_artists)
    ? (music!.top_artists as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name }))
    : [];
  return {
    id: profile.id,
    firstName: profile.first_name,
    gender: (profile.gender as MatchProfile["gender"]) ?? null,
    track: (profile.track as Track | null) ?? null,
    preArrival: profile.pre_arrival,
    admitTermId: profile.admit_term_id,
    academicCollege: profile.academic_college,
    residentialCollege: profile.residential_college,
    llc: profile.llc,
    accommodations: extras.accommodations ?? [],
    scenarios: extras.scenarios ?? {},
    classDay: extras.classDay ?? null,
    music: music && artists.length > 0 ? { artists, genres: music.top_genres ?? [] } : null,
    prefs: {
      budgetMin: prefs.budget_min,
      budgetMax: prefs.budget_max,
      areas: prefs.areas ?? [],
      moveInDate: prefs.move_in_date,
      leaseLength: prefs.lease_length as MatchProfile["prefs"]["leaseLength"],
      housingType: prefs.housing_type as MatchProfile["prefs"]["housingType"],
      genderPref: (prefs.gender_pref ?? []) as MatchProfile["prefs"]["genderPref"],
      sleepSchedule: prefs.sleep_schedule,
      cleanliness: prefs.cleanliness,
      noise: prefs.noise,
      guests: prefs.guests,
      smoking: prefs.smoking as MatchProfile["prefs"]["smoking"],
      drinking: prefs.drinking as MatchProfile["prefs"]["drinking"],
      pets: prefs.pets as MatchProfile["prefs"]["pets"],
      study: prefs.study as MatchProfile["prefs"]["study"],
      dealbreakers: (prefs.dealbreakers ?? []) as MatchProfile["prefs"]["dealbreakers"],
      weights: (prefs.weights ?? {}) as Partial<Record<FactorKey, Importance>>,
    },
  };
}

/** Earliest start and latest end across weekday class blocks, in minutes. */
export function classDayOf(blocks: unknown): MatchProfile["classDay"] {
  if (!Array.isArray(blocks)) return null;
  const minutes = (hhmm: unknown) => {
    if (typeof hhmm !== "string" || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(":").map(Number) as [number, number];
    return h * 60 + m;
  };
  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  for (const block of blocks as { day?: unknown; start?: unknown; end?: unknown }[]) {
    if (typeof block.day !== "number" || block.day > 4) continue; // weekdays only
    const start = minutes(block.start);
    const end = minutes(block.end);
    if (start === null || end === null || end <= start) continue;
    earliestStart = Math.min(earliestStart, start);
    latestEnd = Math.max(latestEnd, end);
  }
  return Number.isFinite(earliestStart) ? { earliestStart, latestEnd } : null;
}

export interface SchoolPool {
  pool: MatchProfile[];
  areaNames: Record<string, string>;
  context: PoolContext;
}

/**
 * Everyone at a school who can currently be matched, with what the engine needs: hard
 * constraints (accommodations, school rules, pools), scenario answers and class days.
 * Staff are never matched; a school can take demo profiles out; a live pilot limits the
 * pool to its scope; withdrawn admits are hidden.
 */
export async function loadSchoolPool(schoolId: string): Promise<SchoolPool> {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: school }, { data: pilot }] = await Promise.all([
    admin.from("schools").select("hide_seed_profiles, merge_track_pools").eq("id", schoolId).maybeSingle(),
    admin.from("pilot_configs").select("scope, starts_on, ends_on").eq("school_id", schoolId).maybeSingle(),
  ]);
  let poolQuery = admin
    .from("profiles")
    .select(
      "id, first_name, gender, track, pre_arrival, admit_term_id, academic_college, residential_college, llc, is_hidden, preferences(*), music_profiles(*)",
    )
    .eq("school_id", schoolId)
    .not("onboarding_completed_at", "is", null)
    .is("banned_at", null)
    .eq("is_staff", false);
  if (school?.hide_seed_profiles) poolQuery = poolQuery.eq("is_seed", false);
  const scope = pilot && pilot.starts_on <= today && today <= pilot.ends_on ? pilotColleges(pilot.scope) : [];
  if (scope.length) poolQuery = poolQuery.in("residential_college", scope);

  const [people, areas, constraints, rules, questions] = await Promise.all([
    poolQuery.returns<PoolRow[]>(),
    admin.from("areas").select("slug, name").eq("school_id", schoolId),
    admin.from("accommodation_constraints").select("user_id, constraint_key, expires_on").eq("school_id", schoolId),
    admin.from("school_rules").select("rule_type, params, active").eq("school_id", schoolId).eq("active", true),
    loadActiveQuestions(schoolId),
  ]);
  if (people.error) throw people.error;
  const ids = (people.data ?? []).map((p) => p.id);
  const [answers, schedules] = ids.length
    ? await Promise.all([
        admin.from("school_question_answers").select("user_id, question_key, question_version, choice_key").in("user_id", ids),
        admin.from("class_schedules").select("user_id, blocks").in("user_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const accommodations = new Map<string, AccommodationConstraintKey[]>();
  for (const c of constraints.data ?? []) {
    if ((c.expires_on && c.expires_on < today) || !isAccommodationKey(c.constraint_key)) continue;
    accommodations.set(c.user_id, [...(accommodations.get(c.user_id) ?? []), c.constraint_key]);
  }
  const answersByUser = new Map<string, { question_key: string; question_version: number; choice_key: string }[]>();
  for (const a of answers.data ?? []) answersByUser.set(a.user_id, [...(answersByUser.get(a.user_id) ?? []), a]);
  const classDays = new Map((schedules.data ?? []).map((s) => [s.user_id, classDayOf(s.blocks)]));

  const pool: MatchProfile[] = [];
  for (const person of people.data ?? []) {
    // Hidden profiles keep their existing matches but a withdrawn admit drops out entirely.
    if (person.pre_arrival && person.is_hidden) continue;
    if (!person.preferences) continue;
    pool.push(
      toMatchProfile(person, person.preferences, person.music_profiles, {
        accommodations: accommodations.get(person.id),
        scenarios: toScenarioAnswers(answersByUser.get(person.id) ?? [], questions),
        classDay: classDays.get(person.id) ?? null,
      }),
    );
  }
  // "Tempe — near campus" reads better as "Tempe" inside a sentence.
  const areaNames = Object.fromEntries((areas.data ?? []).map((a) => [a.slug, a.name.split(" — ")[0]]));
  const context: PoolContext = {
    mergeTrackPools: Boolean(school?.merge_track_pools),
    schoolRules: (rules.data ?? []).map((r) => ({ type: r.rule_type as SchoolRuleType, active: r.active, params: (r.params ?? {}) as Record<string, unknown> })),
  };
  return { pool, areaNames, context };
}

function pilotColleges(scope: unknown): string[] {
  const value = scope && typeof scope === "object" ? (scope as { residential_colleges?: unknown }).residential_colleges : null;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toRow(
  viewer: string,
  candidate: string,
  result: MatchEvaluation,
  side: "forA" | "forB",
  now: string,
): ScoreInsert {
  const view = result[side];
  return {
    viewer_id: viewer,
    candidate_id: candidate,
    score: result.score,
    reasons: view.reasons as unknown as NonNullable<Json>,
    watchouts: view.watchouts as unknown as NonNullable<Json>,
    breakdown: view.breakdown as unknown as NonNullable<Json>,
    shared_artists: result.sharedArtists as unknown as NonNullable<Json>,
    computed_at: now,
  };
}

export interface RecomputeResult {
  matches: number;
  strongNotified: number;
}

/**
 * Recomputes every pair involving `userId`, in both directions, against the
 * user's school. Pairs that now fail a hard filter are deleted. People who
 * newly cross the strong-match threshold get an in-app notification.
 */
export async function recomputeMatchesFor(userId: string): Promise<RecomputeResult> {
  const admin = createAdminClient();
  const { data: me, error } = await admin
    .from("profiles")
    .select("id, school_id, onboarding_completed_at, banned_at")
    .eq("id", userId)
    .single();
  if (error) throw error;

  if (!me.onboarding_completed_at || me.banned_at) {
    await admin.rpc("prune_match_scores", { p_user: userId, p_keep: [] });
    return { matches: 0, strongNotified: 0 };
  }

  const { pool, areaNames, context } = await loadSchoolPool(me.school_id);
  const viewer = pool.find((p) => p.id === userId);
  if (!viewer) return { matches: 0, strongNotified: 0 };

  // Everyone else's current view of this user, to detect newly strong matches.
  const { data: previous } = await admin
    .from("match_scores")
    .select("viewer_id, score, notified_at")
    .eq("candidate_id", userId);
  const before = new Map((previous ?? []).map((r) => [r.viewer_id, r]));

  const now = new Date().toISOString();
  const rows: ScoreInsert[] = [];
  const keep: string[] = [];
  const strong: { viewerId: string; score: number }[] = [];

  for (const other of pool) {
    if (other.id === userId) continue;
    const result = evaluateMatch(viewer, other, { areaNames, ...context });
    if (!result) continue;
    keep.push(other.id);
    rows.push(toRow(userId, other.id, result, "forA", now));
    rows.push(toRow(other.id, userId, result, "forB", now));
    const prior = before.get(other.id);
    const newlyStrong = !prior || (prior.score < STRONG_MATCH_THRESHOLD && !prior.notified_at);
    if (result.score >= STRONG_MATCH_THRESHOLD && newlyStrong) {
      strong.push({ viewerId: other.id, score: result.score });
    }
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: upsertError } = await admin
      .from("match_scores")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "viewer_id,candidate_id" });
    if (upsertError) throw upsertError;
  }

  const { error: pruneError } = await admin.rpc("prune_match_scores", { p_user: userId, p_keep: keep });
  if (pruneError) throw pruneError;

  const strongNotified = await notifyStrongMatches(userId, viewer.firstName, strong);
  return { matches: keep.length, strongNotified };
}

async function notifyStrongMatches(
  userId: string,
  firstName: string,
  strong: { viewerId: string; score: number }[],
) {
  if (strong.length === 0) return 0;
  const admin = createAdminClient();
  const viewerIds = strong.map((s) => s.viewerId);

  const [{ data: settings }, { data: existing }] = await Promise.all([
    admin.from("user_settings").select("user_id, notify_inapp_matches").in("user_id", viewerIds),
    admin
      .from("notifications")
      .select("user_id")
      .eq("type", "strong_match")
      .eq("entity_id", userId)
      .in("user_id", viewerIds),
  ]);
  const allowed = new Set((settings ?? []).filter((s) => s.notify_inapp_matches).map((s) => s.user_id));
  const already = new Set((existing ?? []).map((n) => n.user_id));

  const notifications = strong
    .filter((s) => allowed.has(s.viewerId) && !already.has(s.viewerId))
    .map((s) => ({
      user_id: s.viewerId,
      type: "strong_match",
      actor_id: userId,
      entity_id: userId,
      title: `New ${s.score}% match: ${firstName}`,
      body: "Someone new fits what you're looking for.",
      href: `/profile/${userId}`,
    }));

  if (notifications.length > 0) {
    const { error } = await admin.from("notifications").insert(notifications);
    if (error) console.error("[recompute] strong-match notifications failed", error);
  }
  await admin
    .from("match_scores")
    .update({ notified_at: new Date().toISOString() })
    .eq("candidate_id", userId)
    .in("viewer_id", viewerIds);
  return notifications.length;
}
