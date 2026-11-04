import { describe, expect, it } from "vitest";
import { classSimilarity, evaluateMatch, hardFilterFailure, scenarioSimilarities } from "./engine";
import { accommodationConflict, isAccommodationKey } from "./accommodations";
import { blockingRule, describeFailure } from "./blocking";
import type { MatchPreferences, MatchProfile, ScenarioAnswer } from "./types";

function prefs(overrides: Partial<MatchPreferences> = {}): MatchPreferences {
  return {
    budgetMin: 800,
    budgetMax: 1100,
    areas: ["tempe-campus"],
    moveInDate: "2027-08-10",
    leaseLength: "academic_year",
    housingType: "on_campus",
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

function person(
  id: string,
  extra: Partial<MatchProfile> = {},
  p: Partial<MatchPreferences> = {},
): MatchProfile {
  return {
    id,
    firstName: id.toUpperCase(),
    gender: "woman",
    prefs: prefs(p),
    music: null,
    ...extra,
  };
}

const guests = (value: number): ScenarioAnswer => ({
  factor: "guests",
  value,
  reason: "Both want a heads-up before overnight guests",
  topic: "overnight guests",
});

describe("pools", () => {
  it("keeps tracks apart unless the school merges them", () => {
    const a = person("a", { track: "grad" });
    const b = person("b", { track: "freshman" });
    expect(hardFilterFailure(a, b)?.kind).toBe("track_pool");
    expect(hardFilterFailure(a, b, { mergeTrackPools: true })).toBeNull();
    expect(hardFilterFailure(a, person("c", { track: "grad" }))).toBeNull();
  });

  it("matches pre-arrival students with each other and with incoming students only", () => {
    const admit = person("a", { preArrival: true, track: "freshman", admitTermId: "t1" });
    expect(
      hardFilterFailure(
        admit,
        person("b", { preArrival: true, track: "freshman", admitTermId: "t1" }),
      ),
    ).toBeNull();
    expect(
      hardFilterFailure(
        admit,
        person("c", { preArrival: true, track: "freshman", admitTermId: "t2" }),
      )?.kind,
    ).toBe("pre_arrival_pool");
    expect(hardFilterFailure(admit, person("d", { track: "freshman" }))).toBeNull();
    expect(hardFilterFailure(admit, person("e", { track: "transfer" }))).toBeNull();
    expect(hardFilterFailure(admit, person("f", { track: "returning" }))?.kind).toBe(
      "pre_arrival_pool",
    );
    expect(hardFilterFailure(admit, person("g"))?.kind).toBe("pre_arrival_pool");
  });
});

describe("accommodations", () => {
  it("knows its keys", () => {
    expect(isAccommodationKey("esa_approved")).toBe(true);
    expect(isAccommodationKey("anything_else")).toBe(false);
  });

  it("never pairs an approved animal with a no-pets dealbreaker, either way round", () => {
    const esa = person("a", { accommodations: ["esa_approved"] });
    const noPets = person("b", {}, { dealbreakers: ["pets"] });
    expect(accommodationConflict(esa, noPets)?.kind).toBe("accommodation");
    expect(accommodationConflict(noPets, esa)?.kind).toBe("accommodation");
    expect(evaluateMatch(esa, noPets)).toBeNull();
    expect(evaluateMatch(esa, person("c"))).not.toBeNull();
  });

  it("keeps an allergen-free student away from smokers and pet owners", () => {
    const af = person("a", { accommodations: ["allergen_free"] });
    expect(evaluateMatch(af, person("b", {}, { smoking: "sometimes" }))).toBeNull();
    expect(evaluateMatch(af, person("c", {}, { pets: "have" }))).toBeNull();
    expect(evaluateMatch(af, person("d"))).not.toBeNull();
  });

  it("room-level accommodations don't change who can be paired", () => {
    const a = person("a", {
      accommodations: ["ground_floor", "single_bathroom", "mobility_accessible"],
    });
    expect(hardFilterFailure(a, person("b"))).toBeNull();
  });

  it("explanations never mention an accommodation", () => {
    const a = person("a", { accommodations: ["esa_approved"] });
    const result = evaluateMatch(a, person("b"))!;
    const text = JSON.stringify([result.forA, result.forB]).toLowerCase();
    expect(text).not.toMatch(/esa|accommodation|animal|allerg/);
  });
});

describe("school rules", () => {
  const rules = [{ type: "llc_exclusive" as const, active: true }];
  it("applies active rules inside evaluateMatch", () => {
    const a = person("a", { llc: "honors_stem" });
    const b = person("b", { llc: null });
    expect(evaluateMatch(a, b, { schoolRules: rules })).toBeNull();
    expect(evaluateMatch(a, b)).not.toBeNull();
    expect(
      evaluateMatch(a, person("c", { llc: "honors_stem" }), { schoolRules: rules }),
    ).not.toBeNull();
  });

  it("ignores inactive rules", () => {
    expect(
      evaluateMatch(person("a", { llc: "x" }), person("b"), {
        schoolRules: [{ type: "llc_exclusive", active: false }],
      }),
    ).not.toBeNull();
  });
});

describe("scenario questions", () => {
  it("only counts questions both students answered at the same version", () => {
    const a = person("a", {
      scenarios: {
        "partner_overnight@1": guests(2),
        "dishes@1": { ...guests(4), factor: "cleanliness" },
      },
    });
    const b = person("b", {
      scenarios: {
        "partner_overnight@1": guests(2),
        "dishes@2": { ...guests(1), factor: "cleanliness" },
      },
    });
    expect(scenarioSimilarities(a, b)).toEqual({ guests: 1 });
  });

  it("refines the factor score instead of adding points", () => {
    const base = evaluateMatch(person("a"), person("b"))!.score;
    const agree = evaluateMatch(
      person("a", { scenarios: { "q@1": guests(2) } }),
      person("b", { scenarios: { "q@1": guests(2) } }),
    )!.score;
    const disagree = evaluateMatch(
      person("a", { scenarios: { "q@1": guests(1) } }),
      person("b", { scenarios: { "q@1": guests(5) } }),
    )!.score;
    expect(agree).toBe(base);
    expect(disagree).toBeLessThan(base);
  });

  it("explains a shared answer and flags a far-apart one", () => {
    const a = person("a", { scenarios: { "q@1": guests(2) } }, { weights: { guests: 3 } });
    const same = evaluateMatch(
      a,
      person("b", { scenarios: { "q@1": guests(2) } }, { weights: { guests: 3 } }),
    )!;
    expect(same.forA.reasons.map((r) => r.label)).toContain(
      "Both want a heads-up before overnight guests",
    );
    const far = evaluateMatch(
      person("a", { scenarios: { "q@1": guests(1) } }, { guests: 1, weights: { guests: 3 } }),
      person("b", { scenarios: { "q@1": guests(5) } }, { guests: 5, weights: { guests: 3 } }),
    )!;
    expect(far.forA.watchouts.map((r) => r.label)).toContain(
      "You'd handle overnight guests differently",
    );
  });

  it("removing every scenario answer brings the score back exactly", () => {
    const withAnswers = evaluateMatch(
      person("a", { scenarios: { "q@1": guests(1) } }),
      person("b", { scenarios: { "q@1": guests(4) } }),
    )!.score;
    const without = evaluateMatch(person("a"), person("b"))!.score;
    expect(withAnswers).not.toBe(without);
    expect(
      evaluateMatch(person("a", { scenarios: {} }), person("b", { scenarios: {} }))!.score,
    ).toBe(without);
  });
});

describe("class schedule", () => {
  it("is skipped unless both added a schedule", () => {
    expect(
      classSimilarity(
        person("a"),
        person("b", { classDay: { earliestStart: 480, latestEnd: 900 } }),
      ),
    ).toBeNull();
  });

  it("scores similar days high and opposite days low", () => {
    const early = { earliestStart: 8 * 60, latestEnd: 14 * 60 };
    const late = { earliestStart: 13 * 60, latestEnd: 21 * 60 };
    expect(
      classSimilarity(person("a", { classDay: early }), person("b", { classDay: early })),
    ).toBe(1);
    expect(classSimilarity(person("a", { classDay: early }), person("b", { classDay: late }))).toBe(
      0,
    );
  });
});

describe("auto-pair blocking rule", () => {
  it("names the filter that blocks the most waiting students, never an accommodation detail", () => {
    expect(describeFailure({ kind: "dealbreaker", who: "a", dealbreaker: "smoking" })).toBe(
      "Dealbreaker: no smokers",
    );
    expect(
      describeFailure({ kind: "accommodation", who: "a", constraintKey: "allergen_free" }),
    ).toBe("A housing constraint");
    expect(
      describeFailure({ kind: "school_rule", who: "a", ruleType: "same_residential_college" }),
    ).toBe("School rule: same residential college");
    const smoker = person("s", {}, { smoking: "regularly" });
    const others = [
      person("a", {}, { dealbreakers: ["smoking"] }),
      person("b", {}, { dealbreakers: ["smoking"] }),
      person("c", { gender: "man" }, { genderPref: ["man"] }),
    ];
    expect(blockingRule(smoker, [smoker, ...others])).toEqual({
      label: "Dealbreaker: no smokers",
      blocked: 2,
      of: 3,
    });
    expect(blockingRule(person("z"), [person("y")])).toBeNull();
  });
});
