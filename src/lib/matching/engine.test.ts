import { describe, expect, it } from "vitest";
import {
  areaSimilarity,
  budgetSimilarity,
  evaluateMatch,
  hardFilterFailure,
  moveInSimilarity,
  satisfaction,
  factorSimilarities,
  type MatchPreferences,
  type MatchProfile,
} from "./index";
import { FACTORS, type FactorKey, type Importance } from "@/lib/options";

function prefs(overrides: Partial<MatchPreferences> = {}): MatchPreferences {
  return {
    budgetMin: 800,
    budgetMax: 1100,
    areas: ["tempe-campus"],
    moveInDate: "2027-08-10",
    leaseLength: "academic_year",
    housingType: "off_campus",
    genderPref: [],
    sleepSchedule: 3,
    cleanliness: 4,
    noise: 2,
    guests: 2,
    smoking: "never",
    drinking: "socially",
    pets: "none",
    study: "home_quiet",
    dealbreakers: [],
    weights: {},
    ...overrides,
  };
}

function person(id: string, overrides: Partial<MatchPreferences> = {}, extra: Partial<MatchProfile> = {}): MatchProfile {
  return { id, firstName: id.toUpperCase(), gender: "woman", prefs: prefs(overrides), music: null, ...extra };
}

const allWeights = (value: Importance) =>
  Object.fromEntries(FACTORS.map((key) => [key, value])) as Record<FactorKey, Importance>;

describe("evaluateMatch — scoring", () => {
  it("gives identical people a perfect score", () => {
    const result = evaluateMatch(person("a"), person("b"));
    expect(result?.score).toBe(100);
  });

  it("is symmetric", () => {
    const a = person("a", { sleepSchedule: 1, cleanliness: 5, budgetMin: 700, budgetMax: 950 });
    const b = person("b", { sleepSchedule: 4, cleanliness: 3, noise: 4, pets: "have" });
    expect(evaluateMatch(a, b)?.score).toBe(evaluateMatch(b, a)?.score);
  });

  it("always returns an integer between 0 and 100", () => {
    const a = person("a", { sleepSchedule: 1, cleanliness: 1, noise: 1, guests: 1, smoking: "never", drinking: "never" });
    const b = person("b", {
      sleepSchedule: 5, cleanliness: 5, noise: 5, guests: 5, smoking: "regularly", drinking: "often",
      pets: "have", study: "home_social", housingType: "on_campus", leaseLength: "semester",
      areas: ["mesa"], budgetMin: 2000, budgetMax: 2500, moveInDate: "2028-01-01",
    });
    const score = evaluateMatch(a, b)!.score;
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeLessThan(30);
  });

  it("ranks a closer lifestyle match higher", () => {
    const viewer = person("me", { sleepSchedule: 2, cleanliness: 5 });
    const close = person("close", { sleepSchedule: 2, cleanliness: 4 });
    const far = person("far", { sleepSchedule: 5, cleanliness: 1 });
    expect(evaluateMatch(viewer, close)!.score).toBeGreaterThan(evaluateMatch(viewer, far)!.score);
  });

  it("weights a mismatch by how much each person cares about it", () => {
    const b = person("b", { sleepSchedule: 5 });
    const casual = person("a", { sleepSchedule: 1, weights: { sleep: 1 } });
    const strict = person("a", { sleepSchedule: 1, weights: { sleep: 3 } });
    expect(evaluateMatch(strict, b)!.score).toBeLessThan(evaluateMatch(casual, b)!.score);
  });

  it("ignores factors marked as not mattering", () => {
    const b = person("b", { pets: "have" });
    const doesntCare = person("a", { weights: { pets: 0 } });
    const satisfactionA = satisfaction(doesntCare.prefs, factorSimilarities(doesntCare, b));
    expect(satisfactionA).toBe(1);
  });

  it("still produces a score when every factor is marked as not mattering", () => {
    const a = person("a", { weights: allWeights(0), sleepSchedule: 1 });
    const b = person("b", { weights: allWeights(0), sleepSchedule: 5 });
    const result = evaluateMatch(a, b)!;
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("needs both people to be happy (geometric mean of each side's satisfaction)", () => {
    // A only cares about budget (which matches); B only cares about sleep (which doesn't).
    const only = (key: FactorKey) => ({ ...allWeights(0), [key]: 3 as Importance });
    const a = person("a", { sleepSchedule: 1, weights: only("budget") });
    const b = person("b", { sleepSchedule: 5, weights: only("sleep") });
    const result = evaluateMatch(a, b)!;
    expect(result.forA.satisfaction).toBe(1);
    expect(result.forB.satisfaction).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe("hard filters", () => {
  it("respects gender preference in both directions", () => {
    const a = person("a", { genderPref: ["woman"] });
    const man = person("b", {}, { gender: "man" });
    expect(evaluateMatch(a, man)).toBeNull();
    expect(evaluateMatch(man, a)).toBeNull();
    expect(hardFilterFailure(a, man)).toEqual({ kind: "gender", who: "a" });
  });

  it("excludes people who didn't share a gender from gender-specific searches only", () => {
    const undisclosed = person("b", {}, { gender: "undisclosed" });
    expect(evaluateMatch(person("a", { genderPref: ["woman", "nonbinary"] }), undisclosed)).toBeNull();
    expect(evaluateMatch(person("a"), undisclosed)).not.toBeNull();
  });

  const cases: Array<[string, Partial<MatchPreferences>, Partial<MatchPreferences>]> = [
    ["smoking", { dealbreakers: ["smoking"] }, { smoking: "sometimes" }],
    ["pets", { dealbreakers: ["pets"] }, { pets: "want" }],
    ["drinking", { dealbreakers: ["drinking"] }, { drinking: "often" }],
    ["guests", { dealbreakers: ["guests"] }, { guests: 4 }],
    ["sleep", { dealbreakers: ["sleep"], sleepSchedule: 1 }, { sleepSchedule: 3 }],
    ["cleanliness", { dealbreakers: ["cleanliness"], cleanliness: 5 }, { cleanliness: 3 }],
    ["noise", { dealbreakers: ["noise"] }, { noise: 4 }],
    ["budget", { dealbreakers: ["budget"], budgetMin: 600, budgetMax: 800 }, { budgetMin: 900, budgetMax: 1200 }],
    ["area", { dealbreakers: ["area"], areas: ["tempe-campus"] }, { areas: ["mesa"] }],
    ["move_in", { dealbreakers: ["move_in"], moveInDate: "2027-08-01" }, { moveInDate: "2027-09-15" }],
    ["housing_type", { dealbreakers: ["housing_type"], housingType: "on_campus" }, { housingType: "off_campus" }],
  ];

  it.each(cases)("enforces the %s dealbreaker from either side", (rule, ownerPrefs, otherPrefs) => {
    const owner = person("owner", ownerPrefs);
    const other = person("other", otherPrefs);
    expect(evaluateMatch(owner, other)).toBeNull();
    expect(evaluateMatch(other, owner)).toBeNull();
    expect(hardFilterFailure(owner, other)).toMatchObject({ kind: "dealbreaker", dealbreaker: rule });
  });

  it("lets borderline values through", () => {
    expect(evaluateMatch(person("a", { dealbreakers: ["sleep"], sleepSchedule: 2 }), person("b", { sleepSchedule: 3 }))).not.toBeNull();
    expect(evaluateMatch(person("a", { dealbreakers: ["cleanliness"], cleanliness: 4 }), person("b", { cleanliness: 3 }))).not.toBeNull();
    expect(evaluateMatch(person("a", { dealbreakers: ["move_in"], moveInDate: "2027-08-01" }), person("b", { moveInDate: "2027-08-31" }))).not.toBeNull();
    expect(evaluateMatch(person("a", { dealbreakers: ["housing_type"], housingType: "on_campus" }), person("b", { housingType: "either" }))).not.toBeNull();
    expect(evaluateMatch(person("a", { dealbreakers: ["budget"], budgetMax: 900 }), person("b", { budgetMin: 900, budgetMax: 1000 }))).not.toBeNull();
  });

  it("never matches someone with themselves", () => {
    const a = person("same");
    expect(evaluateMatch(a, a)).toBeNull();
  });
});

describe("factor similarity", () => {
  it("scores budget overlap and gaps", () => {
    expect(budgetSimilarity(prefs(), prefs())).toBe(1);
    expect(budgetSimilarity(prefs({ budgetMin: 600, budgetMax: 800 }), prefs({ budgetMin: 800, budgetMax: 1000 }))).toBeCloseTo(0.6);
    expect(budgetSimilarity(prefs({ budgetMin: 600, budgetMax: 700 }), prefs({ budgetMin: 900, budgetMax: 1000 }))).toBe(0);
  });

  it("scores neighborhoods by overlap", () => {
    expect(areaSimilarity(prefs({ areas: ["a", "b"] }), prefs({ areas: ["b"] }))).toBe(1);
    expect(areaSimilarity(prefs({ areas: ["a", "b"] }), prefs({ areas: ["b", "c"] }))).toBeCloseTo(0.85);
    expect(areaSimilarity(prefs({ areas: ["a"] }), prefs({ areas: ["c"] }))).toBe(0);
    expect(areaSimilarity(prefs({ areas: [] }), prefs({ areas: ["c"] }))).toBe(0.5);
  });

  it("decays move-in compatibility after a week", () => {
    expect(moveInSimilarity(prefs({ moveInDate: "2027-08-01" }), prefs({ moveInDate: "2027-08-06" }))).toBe(1);
    expect(moveInSimilarity(prefs({ moveInDate: "2027-08-01" }), prefs({ moveInDate: "2027-12-01" }))).toBe(0);
    expect(moveInSimilarity(prefs({ moveInDate: null }), prefs())).toBe(0.5);
  });
});

describe("music (optional)", () => {
  const music = (ids: string[], genres: string[]) => ({
    artists: ids.map((id) => ({ id, name: `Artist ${id}` })),
    genres,
  });

  it("only counts music when both people connected Spotify", () => {
    const withMusic = person("a", {}, { music: music(["1", "2"], ["indie"]) });
    const without = person("b");
    const result = evaluateMatch(withMusic, without)!;
    expect(result.forA.breakdown.some((f) => f.key === "music")).toBe(false);
    expect(result.sharedArtists).toEqual([]);
  });

  it("lists shared artists and explains them", () => {
    const a = person("a", { sleepSchedule: 1 }, { music: music(["1", "2", "3"], ["indie", "pop"]) });
    const b = person("b", { sleepSchedule: 5 }, { music: music(["3", "2", "9"], ["indie", "rap"]) });
    const result = evaluateMatch(a, b)!;
    expect(result.sharedArtists.map((x) => x.id)).toEqual(["2", "3"]);
    expect(result.forA.breakdown.some((f) => f.key === "music")).toBe(true);
  });

  it("raises the score when tastes overlap", () => {
    const base = { sleepSchedule: 3 };
    const a = person("a", base, { music: music(["1", "2", "3", "4"], ["indie", "pop"]) });
    const similar = person("b", base, { music: music(["1", "2", "3", "5"], ["indie", "pop"]) });
    const different = person("c", base, { music: music(["7", "8"], ["metal"]) });
    expect(evaluateMatch(a, similar)!.score).toBeGreaterThan(evaluateMatch(a, different)!.score);
  });
});

describe("explanations", () => {
  it("returns at most three reasons, phrased for the viewer", () => {
    const a = person("a", { sleepSchedule: 5, cleanliness: 5, budgetMin: 800, budgetMax: 1100 });
    const b = person("b", { sleepSchedule: 5, cleanliness: 5, budgetMin: 850, budgetMax: 1050 });
    const result = evaluateMatch(a, b, { areaNames: { "tempe-campus": "Tempe" } })!;
    expect(result.forA.reasons.length).toBeLessThanOrEqual(3);
    expect(result.forA.reasons.length).toBeGreaterThan(0);
    const labels = result.forA.reasons.map((r) => r.label);
    expect(labels).toContain("You're both night owls");
    expect(labels).toContain("You both keep things spotless");
  });

  it("uses neighborhood names and budget overlap in reasons", () => {
    const only = (key: FactorKey) => ({ ...allWeights(1), [key]: 3 as Importance });
    const a = person("a", { areas: ["tempe-campus", "mesa"], weights: only("areas") });
    const b = person("b", { areas: ["mesa"], weights: only("areas") });
    const result = evaluateMatch(a, b, { areaNames: { mesa: "Mesa" } })!;
    expect(result.forA.reasons[0].label).toBe("Both looking in Mesa");

    const c = person("c", { budgetMin: 700, budgetMax: 1000, weights: only("budget") });
    const d = person("d", { budgetMin: 800, budgetMax: 1200, weights: only("budget") });
    expect(evaluateMatch(c, d)!.forA.reasons[0].label).toBe("Budgets overlap by $200");
  });

  it("writes watch-outs from the viewer's side", () => {
    const a = person("a", { sleepSchedule: 1, weights: { sleep: 3 } });
    const b = person("b", { sleepSchedule: 5 }, { firstName: "Maya" });
    const result = evaluateMatch(a, b)!;
    expect(result.forA.watchouts[0]).toEqual({ key: "sleep", label: "Maya stays up a lot later than you" });
    expect(result.forB.watchouts.length).toBeLessThanOrEqual(2);
  });

  it("includes every scored factor in the breakdown, most important first", () => {
    const result = evaluateMatch(person("a", { weights: { pets: 3 } }), person("b"))!;
    expect(result.forA.breakdown).toHaveLength(13);
    expect(result.forA.breakdown[0].key).toBe("pets");
    for (const factor of result.forA.breakdown) {
      expect(factor.similarity).toBeGreaterThanOrEqual(0);
      expect(factor.similarity).toBeLessThanOrEqual(1);
    }
  });
});
