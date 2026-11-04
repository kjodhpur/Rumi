import { describe, expect, it } from "vitest";
import {
  MIN_OUTCOME_ROWS,
  auc,
  fitOutcomeWeights,
  invert,
  pairMismatches,
  plantedOutcomes,
} from "./weights-optimizer";
import { DEFAULT_IMPORTANCE } from "@/lib/options";

describe("outcome-trained weights", () => {
  it("refuses with fewer than 200 rows, or too few of either outcome", () => {
    const few = fitOutcomeWeights(plantedOutcomes(MIN_OUTCOME_ROWS - 1, { sleep: 2 }));
    expect(few).toMatchObject({ status: "insufficient_data", rows: 199 });
    if (few.status === "insufficient_data") expect(few.message).toMatch(/not enough data/i);
    const allCalm = plantedOutcomes(400, {}, -12);
    expect(fitOutcomeWeights(allCalm).status).toBe("insufficient_data");
    expect(fitOutcomeWeights(plantedOutcomes(MIN_OUTCOME_ROWS, { sleep: 2 })).status).toBe("ok");
  });

  it("recovers a planted effect with honest intervals", () => {
    const fit = fitOutcomeWeights(
      plantedOutcomes(4000, { sleep: 2.5, cleanliness: 1.5 }, -2, 11),
      0.01,
    );
    expect(fit.status).toBe("ok");
    if (fit.status !== "ok") return;
    const by = Object.fromEntries(fit.estimates.map((e) => [e.factor, e]));
    expect(by.sleep.evidence).toBe("positive");
    expect(by.cleanliness.evidence).toBe("positive");
    // The true values sit inside the 95% intervals.
    expect(by.sleep.low).toBeLessThan(2.5);
    expect(by.sleep.high).toBeGreaterThan(2.5);
    expect(by.cleanliness.low).toBeLessThan(1.5);
    expect(by.cleanliness.high).toBeGreaterThan(1.5);
    // Factors with no effect mostly show no evidence.
    const nulls = ["noise", "guests", "smoking", "drinking", "pets", "study"].filter(
      (f) => by[f].evidence === "none",
    );
    expect(nulls.length).toBeGreaterThanOrEqual(5);
    // Suggested defaults: stronger effect → Important; never Must; no-evidence → Rumi default.
    expect(fit.suggestedWeights.sleep).toBe(2);
    expect(Object.values(fit.suggestedWeights)).not.toContain(3);
    for (const f of nulls)
      expect(fit.suggestedWeights[f as keyof typeof fit.suggestedWeights]).toBe(
        DEFAULT_IMPORTANCE[f as keyof typeof DEFAULT_IMPORTANCE],
      );
    expect(fit.auc).toBeGreaterThan(0.6);
  });

  it("measures mismatch between two students' answers", () => {
    const a = {
      sleepSchedule: 1,
      cleanliness: 5,
      noise: 1,
      guests: 3,
      smoking: "never",
      drinking: "never",
      pets: "none",
      study: "home_quiet",
    };
    const b = {
      sleepSchedule: 5,
      cleanliness: 5,
      noise: 3,
      guests: 3,
      smoking: "regularly",
      drinking: "socially",
      pets: "have",
      study: "home_social",
    };
    expect(pairMismatches(a, b)).toEqual({
      sleep: 1,
      cleanliness: 0,
      noise: 0.5,
      guests: 0,
      smoking: 1,
      drinking: 0.5,
      pets: 1,
      study: 1,
    });
    expect(pairMismatches(a, a)).toEqual({
      sleep: 0,
      cleanliness: 0,
      noise: 0,
      guests: 0,
      smoking: 0,
      drinking: 0,
      pets: 0,
      study: 0,
    });
  });

  it("inverts matrices and computes AUC", () => {
    const inv = invert([
      [4, 7],
      [2, 6],
    ]);
    expect(inv?.[0][0]).toBeCloseTo(0.6);
    expect(inv?.[1][1]).toBeCloseTo(0.4);
    expect(
      invert([
        [1, 2],
        [2, 4],
      ]),
    ).toBeNull();
    expect(auc([0.9, 0.8, 0.2, 0.1], [true, true, false, false])).toBe(1);
    expect(auc([0.5, 0.5], [true, false])).toBe(0.5);
  });
});
