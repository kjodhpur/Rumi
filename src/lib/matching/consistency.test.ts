import { describe, expect, it } from "vitest";
import { checkAnswerConsistency, visibleFlags, type ConsistencyInput } from "./consistency";
import { evaluateMatch } from "./engine";
import type { MatchProfile } from "./types";

const base: ConsistencyInput = {
  sleepSchedule: 3,
  cleanliness: 3,
  noise: 3,
  guests: 3,
  study: "mix",
  smoking: "never",
  drinking: "socially",
  weights: {},
};
const keys = (i: Partial<ConsistencyInput>) =>
  checkAnswerConsistency({ ...base, ...i }).map((f) => f.ruleKey);
const must = {
  sleep: 3,
  cleanliness: 3,
  noise: 3,
  guests: 3,
  smoking: 3,
  drinking: 3,
  pets: 3,
  study: 3,
};

describe("answer-consistency rules", () => {
  it.each([
    ["early_sleep_loud_home", { sleepSchedule: 1, noise: 5 }, { sleepSchedule: 1, noise: 2 }],
    [
      "quiet_study_loud_home",
      { study: "home_quiet", noise: 4 },
      { study: "home_social", noise: 4 },
    ],
    [
      "quiet_study_many_guests",
      { study: "home_quiet", guests: 4 },
      { study: "home_quiet", guests: 2 },
    ],
    ["spotless_many_guests", { cleanliness: 5, guests: 5 }, { cleanliness: 5, guests: 3 }],
    ["everything_must", { weights: must }, { weights: { ...must, pets: 2 } }],
    [
      "ideal_everything",
      {
        cleanliness: 5,
        noise: 1,
        guests: 1,
        drinking: "never",
        weights: { cleanliness: 3, noise: 3, guests: 3 },
      },
      {
        cleanliness: 5,
        noise: 1,
        guests: 1,
        drinking: "never",
        weights: { cleanliness: 3, noise: 2, guests: 3 },
      },
    ],
  ] as const)(
    "%s fires on the contradiction and not on the consistent answers",
    (rule, flagged, fine) => {
      expect(keys(flagged as Partial<ConsistencyInput>)).toContain(rule);
      expect(keys(fine as Partial<ConsistencyInput>)).not.toContain(rule);
    },
  );

  it("stays quiet about a factor the student skipped", () => {
    expect(keys({ sleepSchedule: 1, noise: 5, weights: { noise: 0 } })).not.toContain(
      "early_sleep_loud_home",
    );
    expect(keys({ sleepSchedule: 1, noise: 5, weights: { sleep: 0 } })).not.toContain(
      "early_sleep_loud_home",
    );
  });

  it("comes back after dismissal only when the relevant answers change", () => {
    const flags = checkAnswerConsistency({ ...base, sleepSchedule: 1, noise: 5 });
    const dismissed = flags.map((f) => ({ ruleKey: f.ruleKey, signature: f.signature }));
    expect(visibleFlags(flags, dismissed)).toEqual([]);
    // An unrelated answer changes: still dismissed.
    expect(
      visibleFlags(
        checkAnswerConsistency({ ...base, sleepSchedule: 1, noise: 5, guests: 1 }),
        dismissed,
      ),
    ).toEqual([]);
    // A relevant answer changes and the conflict remains: shown again.
    expect(
      visibleFlags(checkAnswerConsistency({ ...base, sleepSchedule: 2, noise: 5 }), dismissed).map(
        (f) => f.ruleKey,
      ),
    ).toEqual(["early_sleep_loud_home"]);
  });

  it("never alters a match score (flags are not an engine input)", () => {
    const profile = (id: string): MatchProfile => ({
      id,
      firstName: id,
      gender: "woman",
      prefs: {
        budgetMin: 800,
        budgetMax: 1200,
        areas: ["tempe"],
        moveInDate: "2026-08-15",
        leaseLength: "twelve_months",
        housingType: "off_campus",
        genderPref: ["woman"],
        sleepSchedule: 1,
        cleanliness: 5,
        noise: 5,
        guests: 5,
        smoking: "never",
        drinking: "never",
        pets: "none",
        study: "home_quiet",
        dealbreakers: [],
        weights: {},
      },
      music: null,
    });
    const before = evaluateMatch(profile("a"), profile("b"));
    expect(
      checkAnswerConsistency({
        ...base,
        sleepSchedule: 1,
        cleanliness: 5,
        noise: 5,
        guests: 5,
        study: "home_quiet",
      }).length,
    ).toBeGreaterThan(0);
    expect(evaluateMatch(profile("a"), profile("b"))).toEqual(before);
  });
});
