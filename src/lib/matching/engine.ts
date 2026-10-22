import {
  DEFAULT_IMPORTANCE,
  FACTOR_LABELS,
  FACTORS,
  type Dealbreaker,
  type FactorKey,
  type Importance,
} from "@/lib/options";
import type {
  DirectionalResult,
  FactorScore,
  HardFilterFailure,
  MatchEvaluation,
  MatchPreferences,
  MatchProfile,
  Reason,
} from "./types";

/** Importance level → weight. "Must match" counts six times "nice to have". */
export const IMPORTANCE_WEIGHTS: Record<Importance, number> = { 0: 0, 1: 1, 2: 3, 3: 6 };

/** A pair with a strong score triggers a "strong new match" notification. */
export const STRONG_MATCH_THRESHOLD = 85;

const DAY_MS = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// Hard filters
// ─────────────────────────────────────────────────────────────────────────────

function budgetOverlap(a: MatchPreferences, b: MatchPreferences) {
  return Math.min(a.budgetMax, b.budgetMax) - Math.max(a.budgetMin, b.budgetMin);
}

function sharedAreas(a: MatchPreferences, b: MatchPreferences) {
  const set = new Set(b.areas);
  return a.areas.filter((area) => set.has(area));
}

export function moveInGapDays(a: MatchPreferences, b: MatchPreferences): number | null {
  if (!a.moveInDate || !b.moveInDate) return null;
  const diff = Math.abs(Date.parse(a.moveInDate) - Date.parse(b.moveInDate));
  return Math.round(diff / DAY_MS);
}

/** Does `other` break one of `owner`'s dealbreakers? Returns the first one broken. */
export function brokenDealbreaker(owner: MatchPreferences, other: MatchPreferences): Dealbreaker | null {
  for (const rule of owner.dealbreakers) {
    switch (rule) {
      case "smoking":
        if (other.smoking !== "never") return rule;
        break;
      case "pets":
        if (other.pets !== "none") return rule;
        break;
      case "drinking":
        if (other.drinking === "often") return rule;
        break;
      case "guests":
        if (other.guests >= 4) return rule;
        break;
      case "sleep":
        if (Math.abs(owner.sleepSchedule - other.sleepSchedule) >= 2) return rule;
        break;
      case "cleanliness":
        if (other.cleanliness < owner.cleanliness - 1) return rule;
        break;
      case "noise":
        if (other.noise >= 4) return rule;
        break;
      case "budget":
        if (budgetOverlap(owner, other) < 0) return rule;
        break;
      case "area":
        if (owner.areas.length > 0 && other.areas.length > 0 && sharedAreas(owner, other).length === 0) {
          return rule;
        }
        break;
      case "move_in": {
        const gap = moveInGapDays(owner, other);
        if (gap !== null && gap > 30) return rule;
        break;
      }
      case "housing_type":
        if (
          owner.housingType !== "either" &&
          other.housingType !== "either" &&
          owner.housingType !== other.housingType
        ) {
          return rule;
        }
        break;
    }
  }
  return null;
}

function acceptsGender(owner: MatchProfile, other: MatchProfile) {
  if (owner.prefs.genderPref.length === 0) return true;
  if (!other.gender || other.gender === "undisclosed") return false;
  return (owner.prefs.genderPref as string[]).includes(other.gender);
}

/** Null when the pair may be matched; otherwise the first rule that rules it out. */
export function hardFilterFailure(a: MatchProfile, b: MatchProfile): HardFilterFailure | null {
  if (!acceptsGender(a, b)) return { kind: "gender", who: "a" };
  if (!acceptsGender(b, a)) return { kind: "gender", who: "b" };
  const aRule = brokenDealbreaker(a.prefs, b.prefs);
  if (aRule) return { kind: "dealbreaker", who: "a", dealbreaker: aRule };
  const bRule = brokenDealbreaker(b.prefs, a.prefs);
  if (bRule) return { kind: "dealbreaker", who: "b", dealbreaker: bRule };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factor similarity (0–1)
// ─────────────────────────────────────────────────────────────────────────────

const SMOKING_SIM: Record<string, number> = {
  "never|never": 1,
  "never|sometimes": 0.35,
  "never|regularly": 0,
  "sometimes|sometimes": 1,
  "regularly|sometimes": 0.6,
  "regularly|regularly": 1,
};

const DRINKING_SIM: Record<string, number> = {
  "never|never": 1,
  "never|socially": 0.6,
  "never|often": 0.15,
  "socially|socially": 1,
  "often|socially": 0.6,
  "often|often": 1,
};

const PETS_SIM: Record<string, number> = {
  "none|none": 1,
  "have|none": 0.4,
  "none|want": 0.5,
  "have|have": 0.9,
  "have|want": 0.9,
  "want|want": 1,
};

const STUDY_SIM: Record<string, number> = {
  "campus|campus": 1,
  "campus|home_quiet": 0.8,
  "campus|home_social": 0.8,
  "campus|mix": 0.85,
  "home_quiet|home_quiet": 1,
  "home_quiet|home_social": 0.25,
  "home_quiet|mix": 0.6,
  "home_social|home_social": 1,
  "home_social|mix": 0.75,
  "mix|mix": 1,
};

const LEASE_SIM: Record<string, number> = {
  "academic_year|academic_year": 1,
  "academic_year|semester": 0.5,
  "academic_year|twelve_months": 0.6,
  "semester|semester": 1,
  "semester|twelve_months": 0.2,
  "twelve_months|twelve_months": 1,
};

function pairLookup(table: Record<string, number>, a: string, b: string) {
  const key = [a, b].sort().join("|");
  return table[key] ?? 0;
}

function scaleSimilarity(a: number, b: number) {
  return 1 - Math.abs(a - b) / 4;
}

export function budgetSimilarity(a: MatchPreferences, b: MatchPreferences) {
  const overlap = budgetOverlap(a, b);
  if (overlap >= 0) {
    const narrower = Math.max(50, Math.min(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin));
    return 0.6 + 0.4 * Math.min(1, overlap / narrower);
  }
  return Math.max(0, 0.5 - -overlap / 400);
}

export function areaSimilarity(a: MatchPreferences, b: MatchPreferences) {
  if (a.areas.length === 0 || b.areas.length === 0) return 0.5;
  const shared = sharedAreas(a, b).length;
  if (shared === 0) return 0;
  return 0.7 + 0.3 * (shared / Math.min(a.areas.length, b.areas.length));
}

export function moveInSimilarity(a: MatchPreferences, b: MatchPreferences) {
  const gap = moveInGapDays(a, b);
  if (gap === null) return 0.5;
  if (gap <= 7) return 1;
  return Math.max(0, 1 - (gap - 7) / 83);
}

function leaseSimilarity(a: MatchPreferences, b: MatchPreferences) {
  if (a.leaseLength === "flexible" || b.leaseLength === "flexible") {
    return a.leaseLength === b.leaseLength ? 1 : 0.85;
  }
  return pairLookup(LEASE_SIM, a.leaseLength, b.leaseLength);
}

function housingSimilarity(a: MatchPreferences, b: MatchPreferences) {
  if (a.housingType === b.housingType) return 1;
  if (a.housingType === "either" || b.housingType === "either") return 0.9;
  return 0;
}

export function musicSimilarity(a: MatchProfile, b: MatchProfile) {
  if (!a.music || !b.music) return null;
  const theirs = new Set(b.music.artists.map((artist) => artist.id));
  const shared = a.music.artists.filter((artist) => theirs.has(artist.id)).length;
  const artistSim = 1 - Math.exp(-shared / 2.5);
  const genresA = new Set(a.music.genres.slice(0, 20));
  const genresB = new Set(b.music.genres.slice(0, 20));
  const union = new Set([...genresA, ...genresB]).size;
  const intersection = [...genresA].filter((g) => genresB.has(g)).length;
  const genreSim = union === 0 ? 0 : Math.min(1, (intersection / union) * 1.6);
  return Math.min(1, 0.55 * artistSim + 0.45 * genreSim);
}

export function factorSimilarities(a: MatchProfile, b: MatchProfile): Partial<Record<FactorKey, number>> {
  const pa = a.prefs;
  const pb = b.prefs;
  const sims: Partial<Record<FactorKey, number>> = {
    budget: budgetSimilarity(pa, pb),
    areas: areaSimilarity(pa, pb),
    move_in: moveInSimilarity(pa, pb),
    lease: leaseSimilarity(pa, pb),
    housing_type: housingSimilarity(pa, pb),
    sleep: scaleSimilarity(pa.sleepSchedule, pb.sleepSchedule),
    cleanliness: scaleSimilarity(pa.cleanliness, pb.cleanliness),
    noise: scaleSimilarity(pa.noise, pb.noise),
    guests: scaleSimilarity(pa.guests, pb.guests),
    smoking: pairLookup(SMOKING_SIM, pa.smoking, pb.smoking),
    drinking: pairLookup(DRINKING_SIM, pa.drinking, pb.drinking),
    pets: pairLookup(PETS_SIM, pa.pets, pb.pets),
    study: pairLookup(STUDY_SIM, pa.study, pb.study),
  };
  const music = musicSimilarity(a, b);
  if (music !== null) sims.music = music;
  return sims;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function importanceOf(prefs: MatchPreferences, key: FactorKey): Importance {
  const value = prefs.weights[key];
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : DEFAULT_IMPORTANCE[key];
}

/** How satisfied `owner` would be, weighting each factor by their own priorities. */
export function satisfaction(owner: MatchPreferences, sims: Partial<Record<FactorKey, number>>) {
  let total = 0;
  let weighted = 0;
  let plain = 0;
  let count = 0;
  for (const key of FACTORS) {
    const sim = sims[key];
    if (sim === undefined) continue;
    const weight = IMPORTANCE_WEIGHTS[importanceOf(owner, key)];
    total += weight;
    weighted += weight * sim;
    plain += sim;
    count += 1;
  }
  // Someone who marked everything "doesn't matter" still gets a meaningful score.
  if (total === 0) return count === 0 ? 0 : plain / count;
  return weighted / total;
}

/**
 * Evaluates a pair. Returns null when a hard filter (gender preference or any
 * selected dealbreaker, on either side) rules the pair out.
 */
export function evaluateMatch(
  a: MatchProfile,
  b: MatchProfile,
  options: { areaNames?: Record<string, string> } = {},
): MatchEvaluation | null {
  if (a.id === b.id) return null;
  if (hardFilterFailure(a, b)) return null;

  const sims = factorSimilarities(a, b);
  const sa = satisfaction(a.prefs, sims);
  const sb = satisfaction(b.prefs, sims);
  const score = Math.round(100 * Math.sqrt(sa * sb));

  const sharedArtists = a.music && b.music ? sharedArtistList(a, b) : [];
  const ctx = { areaNames: options.areaNames ?? {}, sharedArtists };

  return {
    score: Math.max(0, Math.min(100, score)),
    forA: describe(a, b, sims, sa, ctx),
    forB: describe(b, a, sims, sb, ctx),
    sharedArtists,
  };
}

function sharedArtistList(a: MatchProfile, b: MatchProfile) {
  const theirs = new Set(b.music!.artists.map((artist) => artist.id));
  return a.music!.artists.filter((artist) => theirs.has(artist.id)).slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanations
// ─────────────────────────────────────────────────────────────────────────────

interface DescribeContext {
  areaNames: Record<string, string>;
  sharedArtists: { id: string; name: string }[];
}

function describe(
  viewer: MatchProfile,
  other: MatchProfile,
  sims: Partial<Record<FactorKey, number>>,
  viewerSatisfaction: number,
  ctx: DescribeContext,
): DirectionalResult {
  const breakdown: FactorScore[] = [];
  const candidates: { key: FactorKey; sim: number; weight: number }[] = [];

  for (const key of FACTORS) {
    const sim = sims[key];
    if (sim === undefined) continue;
    const importance = importanceOf(viewer.prefs, key);
    breakdown.push({
      key,
      label: FACTOR_LABELS[key],
      similarity: Math.round(sim * 100) / 100,
      importance,
    });
    const weight =
      (IMPORTANCE_WEIGHTS[importance] + IMPORTANCE_WEIGHTS[importanceOf(other.prefs, key)]) / 2;
    candidates.push({ key, sim, weight });
  }

  const reasons: Reason[] = [];
  const rank = (c: { key: FactorKey; sim: number; weight: number }) =>
    c.sim * c.weight * salience(c.key, viewer.prefs, other.prefs, ctx);
  for (const c of [...candidates]
    .filter((c) => c.sim >= 0.75 && c.weight > 0)
    .sort((x, y) => rank(y) - rank(x) || y.sim - x.sim)) {
    const label = reasonText(c.key, viewer, other, ctx);
    if (label) reasons.push({ key: c.key, label });
    if (reasons.length === 3) break;
  }

  const watchouts: Reason[] = [];
  for (const c of [...candidates]
    .filter((c) => c.sim <= 0.5 && IMPORTANCE_WEIGHTS[importanceOf(viewer.prefs, c.key)] > 0)
    .sort((x, y) => (1 - y.sim) * y.weight - (1 - x.sim) * x.weight)) {
    const label = watchoutText(c.key, viewer, other);
    if (label) watchouts.push({ key: c.key, label });
    if (watchouts.length === 2) break;
  }

  breakdown.sort((x, y) => y.importance - x.importance || y.similarity - x.similarity);

  return { reasons, watchouts, breakdown, satisfaction: Math.round(viewerSatisfaction * 1000) / 1000 };
}

/**
 * Ranking nudge so reasons read as insight, not filler: two night owls is more
 * telling than two people who both picked the middle option, and shared artists
 * beat "same lease length".
 */
function salience(key: FactorKey, a: MatchPreferences, b: MatchPreferences, ctx: DescribeContext) {
  const extremes = (x: number, y: number) => (x <= 2 && y <= 2) || (x >= 4 && y >= 4);
  switch (key) {
    case "sleep":
      return extremes(a.sleepSchedule, b.sleepSchedule) ? 1.15 : 0.9;
    case "cleanliness":
      return extremes(a.cleanliness, b.cleanliness) ? 1.15 : 0.9;
    case "noise":
      return extremes(a.noise, b.noise) ? 1.1 : 0.85;
    case "guests":
      return extremes(a.guests, b.guests) ? 1.05 : 0.8;
    case "music":
      return ctx.sharedArtists.length > 0 ? 1.2 : 0.9;
    case "smoking":
    case "drinking":
    case "pets":
      return 0.85;
    case "lease":
    case "housing_type":
      return 0.75;
    default:
      return 1;
  }
}

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function weeks(days: number) {
  const w = Math.round(days / 7);
  return w <= 1 ? "a week" : `${w} weeks`;
}

export function reasonText(
  key: FactorKey,
  viewer: MatchProfile,
  other: MatchProfile,
  ctx: DescribeContext,
): string | null {
  const a = viewer.prefs;
  const b = other.prefs;
  switch (key) {
    case "budget": {
      const overlap = budgetOverlap(a, b);
      if (a.budgetMin === b.budgetMin && a.budgetMax === b.budgetMax) return "Same budget range";
      return overlap >= 25 ? `Budgets overlap by ${formatUsd(overlap)}` : "Budgets line up";
    }
    case "areas": {
      const shared = sharedAreas(a, b);
      if (shared.length === 0) return null;
      const names = shared.map((slug) => ctx.areaNames[slug] ?? slug);
      return shared.length === 1 ? `Both looking in ${names[0]}` : `Both looking in ${names[0]} & ${names[1]}`;
    }
    case "move_in": {
      const gap = moveInGapDays(a, b);
      if (gap === null) return null;
      return gap <= 7 ? "Moving in the same week" : `Move-in dates ${weeks(gap)} apart`;
    }
    case "lease":
      if (a.leaseLength !== b.leaseLength) return "Lease plans work together";
      return {
        semester: "Both want a one-semester lease",
        academic_year: "Both want an academic-year lease",
        twelve_months: "Both want a 12-month lease",
        flexible: "Both flexible on lease length",
      }[a.leaseLength];
    case "housing_type":
      if (a.housingType === b.housingType && a.housingType !== "either") {
        return a.housingType === "on_campus" ? "Both want to live on campus" : "Both want off-campus";
      }
      return "Same plan for on vs. off campus";
    case "sleep":
      if (a.sleepSchedule >= 4 && b.sleepSchedule >= 4) return "You're both night owls";
      if (a.sleepSchedule <= 2 && b.sleepSchedule <= 2) return "You're both early birds";
      return "Similar sleep schedules";
    case "cleanliness":
      if (a.cleanliness >= 4 && b.cleanliness >= 4) return "You both keep things spotless";
      if (a.cleanliness <= 2 && b.cleanliness <= 2) return "Equally relaxed about mess";
      return "Same standards for tidiness";
    case "noise":
      if (a.noise <= 2 && b.noise <= 2) return "You both like a quiet place";
      if (a.noise >= 4 && b.noise >= 4) return "You both like a lively home";
      return "Same vibe on noise";
    case "guests":
      if (a.guests <= 2 && b.guests <= 2) return "Neither of you has guests over much";
      if (a.guests >= 4 && b.guests >= 4) return "You both love having people over";
      return "Similar take on guests";
    case "smoking":
      if (a.smoking === "never" && b.smoking === "never") return "Smoke-free, both of you";
      return "On the same page about smoking";
    case "drinking":
      if (a.drinking === "never" && b.drinking === "never") return "Neither of you drinks";
      return "Same take on drinking";
    case "pets":
      if (a.pets === "none" && b.pets === "none") return "Pet-free, both of you";
      if (a.pets !== "none" && b.pets !== "none") return "You're both pet people";
      return null;
    case "study":
      if (a.study === "home_quiet" && b.study === "home_quiet") return "You both study at home and need quiet";
      if (a.study === "campus" && b.study === "campus") return "You both study on campus";
      return "Study habits that fit together";
    case "music": {
      const top = ctx.sharedArtists[0];
      if (top) {
        return ctx.sharedArtists.length > 1
          ? `You both listen to ${top.name} + ${ctx.sharedArtists.length - 1} more`
          : `You both listen to ${top.name}`;
      }
      return "Similar music taste";
    }
  }
}

export function watchoutText(key: FactorKey, viewer: MatchProfile, other: MatchProfile): string | null {
  const a = viewer.prefs;
  const b = other.prefs;
  const name = other.firstName || "They";
  switch (key) {
    case "budget":
      return budgetOverlap(a, b) < 0 ? "Budgets don't overlap" : null;
    case "areas":
      return sharedAreas(a, b).length === 0 ? "No neighborhoods in common yet" : null;
    case "move_in": {
      const gap = moveInGapDays(a, b);
      return gap === null ? null : `Move-in dates ${weeks(gap)} apart`;
    }
    case "lease":
      return "Different lease lengths";
    case "housing_type":
      return a.housingType === "on_campus"
        ? `You want on campus, ${name} wants off`
        : `You want off campus, ${name} wants on`;
    case "sleep":
      return b.sleepSchedule > a.sleepSchedule
        ? `${name} stays up a lot later than you`
        : `${name} is up a lot earlier than you`;
    case "cleanliness":
      return b.cleanliness < a.cleanliness
        ? `${name} is more relaxed about mess`
        : `${name} is tidier than you`;
    case "noise":
      return b.noise > a.noise ? `${name} likes it louder` : `${name} prefers it quieter`;
    case "guests":
      return b.guests > a.guests ? `${name} has people over more often` : `${name} has guests over less`;
    case "smoking":
      return b.smoking === "never" ? `${name} doesn't smoke` : `${name} smokes ${b.smoking}`;
    case "drinking":
      return b.drinking === "often"
        ? `${name} drinks more often`
        : b.drinking === "never"
          ? `${name} doesn't drink`
          : `${name} drinks socially`;
    case "pets":
      return b.pets === "have" ? `${name} has a pet` : b.pets === "want" ? `${name} wants a pet` : `${name} prefers no pets`;
    case "study":
      return "Different study habits at home";
    case "music":
      return null;
  }
}
