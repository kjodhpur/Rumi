import { IMPORTANCE_WEIGHT, LIFESTYLE_LABELS, LIFESTYLE_SCALE_KEYS } from "./constants";
import type {
  HousingPrefs,
  Importance,
  LifestylePrefs,
  MatchBreakdown,
  MatchCandidate,
  MatchResult,
  SpotifyArtist,
  SpotifyGenre,
} from "./types";
import {
  areasCompatible,
  budgetsOverlap,
  cosineSimilarity,
  genderCompatible,
  jaccardWeighted,
  moveInCompatible,
} from "./utils";

const ENUM_DEALBREAKER_KEYS = ["smoking", "drinking", "pets"] as const;

export interface HardFilterContext {
  blockedIds: Set<string>;
  viewerId: string;
}

export function passesHardFilters(
  a: MatchCandidate,
  b: MatchCandidate,
  ctx: HardFilterContext,
): boolean {
  if (a.profile.id === b.profile.id) return false;
  if (!a.profile.verified || !b.profile.verified) return false;
  if (!a.profile.onboarding_complete || !b.profile.onboarding_complete) return false;
  if (a.profile.paused || b.profile.paused) return false;
  if (a.profile.suspended || b.profile.suspended) return false;
  if (ctx.blockedIds.has(b.profile.id)) return false;

  if (
    !budgetsOverlap(
      a.housing.budget_min,
      a.housing.budget_max,
      b.housing.budget_min,
      b.housing.budget_max,
    )
  ) {
    return false;
  }

  if (!areasCompatible(a.housing.preferred_areas, b.housing.preferred_areas)) {
    return false;
  }

  if (!moveInCompatible(a.housing.move_in_term, b.housing.move_in_term)) {
    return false;
  }

  if (
    !genderCompatible(
      a.profile.own_gender,
      a.lifestyle.gender_preference,
      b.profile.own_gender,
      b.lifestyle.gender_preference,
    )
  ) {
    return false;
  }

  if (hasDealbreakerMismatch(a.lifestyle, b.lifestyle)) return false;
  if (hasDealbreakerMismatch(b.lifestyle, a.lifestyle)) return false;

  return true;
}

function hasDealbreakerMismatch(viewer: LifestylePrefs, other: LifestylePrefs): boolean {
  for (const key of viewer.dealbreakers) {
    if ((LIFESTYLE_SCALE_KEYS as readonly string[]).includes(key)) {
      const scaleKey = key as (typeof LIFESTYLE_SCALE_KEYS)[number];
      const gap = Math.abs(viewer[scaleKey] - other[scaleKey]);
      if (gap >= 2) return true;
      continue;
    }
    if ((ENUM_DEALBREAKER_KEYS as readonly string[]).includes(key)) {
      const enumKey = key as (typeof ENUM_DEALBREAKER_KEYS)[number];
      if (viewer[enumKey] !== other[enumKey]) return true;
    }
  }
  return false;
}

function avgWeight(a: Importance | undefined, b: Importance | undefined): number {
  const wa = IMPORTANCE_WEIGHT[a ?? "somewhat"];
  const wb = IMPORTANCE_WEIGHT[b ?? "somewhat"];
  return (wa + wb) / 2;
}

export function lifestyleScore(
  a: LifestylePrefs,
  b: LifestylePrefs,
): {
  score: number;
  categoryScores: MatchBreakdown["categoryScores"];
  frictionPoints: MatchBreakdown["frictionPoints"];
  inCommon: string[];
} {
  let weightedSum = 0;
  let weightTotal = 0;
  const categoryScores: MatchBreakdown["categoryScores"] = [];
  const gaps: MatchBreakdown["frictionPoints"] = [];
  const commons: Array<{ label: string; similarity: number }> = [];

  for (const key of LIFESTYLE_SCALE_KEYS) {
    const yours = a[key];
    const theirs = b[key];
    const similarity = 1 - Math.abs(yours - theirs) / 4;
    const weight = avgWeight(a.weights[key], b.weights[key]);
    weightedSum += similarity * weight;
    weightTotal += weight;
    const label = LIFESTYLE_LABELS[key];
    categoryScores.push({ key, label, yours, theirs, similarity });
    commons.push({ label, similarity });
    gaps.push({
      category: label,
      gap: Math.abs(yours - theirs),
      yours,
      theirs,
    });
  }

  const score = weightTotal === 0 ? 0 : (weightedSum / weightTotal) * 100;

  const inCommon = commons
    .filter((c) => c.similarity >= 0.75)
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, 3)
    .map((c) => c.label);

  const frictionPoints = gaps
    .filter((g) => g.gap >= 2)
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 2);

  return { score, categoryScores, frictionPoints, inCommon };
}

export function musicScore(
  aArtists: SpotifyArtist[],
  bArtists: SpotifyArtist[],
  aGenres: SpotifyGenre[],
  bGenres: SpotifyGenre[],
): {
  score: number;
  sharedArtists: Array<{ id: string; name: string }>;
  sharedGenres: string[];
} {
  const weightedA = aArtists.map((art) => ({
    id: art.id,
    weight: Math.max(1, 51 - art.rank),
  }));
  const weightedB = bArtists.map((art) => ({
    id: art.id,
    weight: Math.max(1, 51 - art.rank),
  }));
  const artistOverlap = jaccardWeighted(weightedA, weightedB);

  const genreVecA: Record<string, number> = {};
  const genreVecB: Record<string, number> = {};
  for (const g of aGenres) genreVecA[g.genre] = g.count;
  for (const g of bGenres) genreVecB[g.genre] = g.count;
  const genreSim = cosineSimilarity(genreVecA, genreVecB);

  const score = (0.6 * artistOverlap + 0.4 * genreSim) * 100;

  const bArtistMap = new Map(bArtists.map((x) => [x.id, x.name]));
  const sharedArtists = aArtists
    .filter((art) => bArtistMap.has(art.id))
    .map((art) => ({ id: art.id, name: art.name }))
    .slice(0, 10);

  const bGenreSet = new Set(bGenres.map((g) => g.genre));
  const sharedGenres = aGenres
    .filter((g) => bGenreSet.has(g.genre))
    .sort((x, y) => y.count - x.count)
    .map((g) => g.genre)
    .slice(0, 8);

  return { score, sharedArtists, sharedGenres };
}

export function computeMatch(a: MatchCandidate, b: MatchCandidate): MatchBreakdown {
  const lifestyle = lifestyleScore(a.lifestyle, b.lifestyle);

  let music: ReturnType<typeof musicScore> | null = null;
  let musicPart: number | null = null;
  if (a.spotifyConnected && b.spotifyConnected) {
    music = musicScore(a.topArtists, b.topArtists, a.genres, b.genres);
    musicPart = music.score;
  }

  const campusBonus = a.profile.campus === b.profile.campus ? 3 : 0;
  const yearBonus = a.profile.year === b.profile.year ? 2 : 0;

  let base: number;
  if (musicPart !== null) {
    base = 0.8 * lifestyle.score + 0.2 * musicPart;
  } else {
    base = lifestyle.score;
  }

  const finalScore = Math.min(100, Math.round((base + campusBonus + yearBonus) * 10) / 10);

  const inCommon = [...lifestyle.inCommon];
  if (campusBonus) inCommon.unshift("Same campus");
  if (music?.sharedArtists[0]) {
    inCommon.push(`Both like ${music.sharedArtists[0].name}`);
  }

  return {
    lifestyleScore: Math.round(lifestyle.score * 10) / 10,
    musicScore: musicPart === null ? null : Math.round(musicPart * 10) / 10,
    finalScore,
    campusBonus,
    yearBonus,
    inCommon: inCommon.slice(0, 3),
    frictionPoints: lifestyle.frictionPoints,
    sharedArtists: music?.sharedArtists ?? [],
    sharedGenres: music?.sharedGenres ?? [],
    categoryScores: lifestyle.categoryScores,
  };
}

export function rankMatches(
  viewer: MatchCandidate,
  candidates: MatchCandidate[],
  ctx: HardFilterContext,
): MatchResult[] {
  const results: MatchResult[] = [];
  for (const other of candidates) {
    if (!passesHardFilters(viewer, other, ctx)) continue;
    const breakdown = computeMatch(viewer, other);
    results.push({
      otherId: other.profile.id,
      score: breakdown.finalScore,
      breakdown,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Symmetric helper for tests: score(a,b) should equal score(b,a). */
export function scoresAreSymmetric(a: MatchCandidate, b: MatchCandidate): boolean {
  const ab = computeMatch(a, b).finalScore;
  const ba = computeMatch(b, a).finalScore;
  return Math.abs(ab - ba) < 0.05;
}

export function emptyHousing(userId: string): HousingPrefs {
  return {
    user_id: userId,
    looking_for: "either",
    budget_min: 600,
    budget_max: 1200,
    preferred_areas: ["Tempe near campus"],
    move_in_term: "Fall 2027",
    lease_length: "flexible",
    roommates_wanted: "1",
    place_status: "needs-place",
  };
}

export function emptyLifestyle(userId: string): LifestylePrefs {
  return {
    user_id: userId,
    sleep_schedule: 3,
    cleanliness: 3,
    guests: 3,
    noise_tolerance: 3,
    social_level: 3,
    study_at_home: 3,
    cooking_sharing: 3,
    smoking: "no",
    drinking: "socially",
    pets: "ok-with-pets",
    gender_preference: "no-preference",
    dealbreakers: [],
    weights: Object.fromEntries(LIFESTYLE_SCALE_KEYS.map((k) => [k, "somewhat" as Importance])),
  };
}
