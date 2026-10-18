import { rankMatches, type HardFilterContext } from "./matching";
import type { HousingPrefs, LifestylePrefs, MatchCandidate, Profile } from "./types";
import { createAdminClient } from "./supabase/admin";

function toCandidate(
  profile: Profile,
  housing: HousingPrefs,
  lifestyle: LifestylePrefs,
  artists: MatchCandidate["topArtists"],
  genres: MatchCandidate["genres"],
  spotifyConnected: boolean,
): MatchCandidate {
  return {
    profile,
    housing,
    lifestyle: {
      ...lifestyle,
      weights: (lifestyle.weights ?? {}) as LifestylePrefs["weights"],
      dealbreakers: lifestyle.dealbreakers ?? [],
    },
    topArtists: artists,
    genres,
    spotifyConnected,
  };
}

export async function getBlockedIdsAdmin(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.blocker_id === userId) ids.add(row.blocked_id);
    else ids.add(row.blocker_id);
  }
  return ids;
}

async function loadCandidateAdmin(userId: string): Promise<MatchCandidate | null> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: housing }, { data: lifestyle }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("housing_prefs").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("lifestyle_prefs").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile || !housing || !lifestyle) return null;
  const [{ data: artists }, { data: genres }, { data: conn }] = await Promise.all([
    admin
      .from("spotify_top_artists")
      .select("artist_id, name, image_url, rank")
      .eq("user_id", userId)
      .order("rank"),
    admin.from("spotify_genres").select("genre, count").eq("user_id", userId),
    admin.from("spotify_connections").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  return toCandidate(
    profile as Profile,
    housing as HousingPrefs,
    lifestyle as LifestylePrefs,
    (artists ?? []).map((a) => ({
      id: a.artist_id as string,
      name: a.name as string,
      image_url: a.image_url as string | null,
      rank: a.rank as number,
    })),
    (genres ?? []).map((g) => ({ genre: g.genre as string, count: g.count as number })),
    Boolean(conn),
  );
}

export async function recomputeMatchCache(userId: string) {
  const admin = createAdminClient();
  const showSeed = process.env.NEXT_PUBLIC_SHOW_SEED_PROFILES === "true";

  const viewer = await loadCandidateAdmin(userId);
  if (!viewer) return;

  let query = admin
    .from("profiles")
    .select("id")
    .eq("onboarding_complete", true)
    .eq("paused", false)
    .eq("suspended", false)
    .neq("id", userId);

  if (!showSeed) {
    query = query.eq("is_seed", false);
  }

  const { data: others } = await query;
  const blocked = await getBlockedIdsAdmin(userId);
  const { data: hidden } = await admin
    .from("hidden_profiles")
    .select("hidden_id")
    .eq("user_id", userId);
  for (const h of hidden ?? []) blocked.add(h.hidden_id);

  const candidates: MatchCandidate[] = [];
  for (const row of others ?? []) {
    if (blocked.has(row.id)) continue;
    const c = await loadCandidateAdmin(row.id);
    if (c) candidates.push(c);
  }

  const ctx: HardFilterContext = { blockedIds: blocked, viewerId: userId };
  const ranked = rankMatches(viewer, candidates, ctx);

  await admin.from("match_cache").delete().eq("user_id", userId);
  if (ranked.length) {
    await admin.from("match_cache").insert(
      ranked.map((r) => ({
        user_id: userId,
        other_id: r.otherId,
        score: r.score,
        breakdown: r.breakdown,
        computed_at: new Date().toISOString(),
      })),
    );
  }
}
