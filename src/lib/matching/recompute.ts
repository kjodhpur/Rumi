import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import type { FactorKey, Importance } from "@/lib/options";
import { evaluateMatch, STRONG_MATCH_THRESHOLD } from "./engine";
import type { MatchEvaluation, MatchProfile } from "./types";

type PrefsRow = Database["public"]["Tables"]["preferences"]["Row"];
type MusicRow = Database["public"]["Tables"]["music_profiles"]["Row"];
type ScoreInsert = Database["public"]["Tables"]["match_scores"]["Insert"];

interface PoolRow {
  id: string;
  first_name: string;
  gender: string | null;
  preferences: PrefsRow | null;
  music_profiles: MusicRow | null;
}

const CHUNK = 400;

export function toMatchProfile(
  profile: { id: string; first_name: string; gender: string | null },
  prefs: PrefsRow,
  music?: MusicRow | null,
): MatchProfile {
  const artists = Array.isArray(music?.top_artists)
    ? (music!.top_artists as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name }))
    : [];
  return {
    id: profile.id,
    firstName: profile.first_name,
    gender: (profile.gender as MatchProfile["gender"]) ?? null,
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

/** Everyone at a school who can currently be matched. */
export async function loadSchoolPool(schoolId: string) {
  const admin = createAdminClient();
  const [people, areas] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, gender, preferences(*), music_profiles(*)")
      .eq("school_id", schoolId)
      .not("onboarding_completed_at", "is", null)
      .is("banned_at", null)
      .returns<PoolRow[]>(),
    admin.from("areas").select("slug, name").eq("school_id", schoolId),
  ]);
  if (people.error) throw people.error;

  const pool: MatchProfile[] = [];
  for (const person of people.data ?? []) {
    if (person.preferences) pool.push(toMatchProfile(person, person.preferences, person.music_profiles));
  }
  // "Tempe — near campus" reads better as "Tempe" inside a sentence.
  const areaNames = Object.fromEntries((areas.data ?? []).map((a) => [a.slug, a.name.split(" — ")[0]]));
  return { pool, areaNames };
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

  const { pool, areaNames } = await loadSchoolPool(me.school_id);
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
    const result = evaluateMatch(viewer, other, { areaNames });
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
