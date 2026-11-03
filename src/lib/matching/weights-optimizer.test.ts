import { describe, expect, it } from "vitest";
import {
  fitOutcomeWeights,
  LIFESTYLE_FACTORS,
  MIN_OUTCOME_SAMPLE_SIZE,
  type OutcomeRecord,
} from "./weights-optimizer";
import type { FactorKey } from "@/lib/options";

function generateRecord(id: string, plantedSleep: boolean): OutcomeRecord {
  const mismatches = {} as Record<FactorKey, number>;
  for (const factor of LIFESTYLE_FACTORS) {
    mismatches[factor] = Math.random() * 0.4; // baseline random small mismatch
  }

  if (plantedSleep) {
    mismatches.sleep = 0.8 + Math.random() * 0.2; // severe sleep mismatch
  }

  // Planted effect: high sleep mismatch causes friction 80% of the time; otherwise 10%
  const frictionProb = plantedSleep ? 0.8 : 0.1;
  const hadFriction = Math.random() < frictionProb;

  return {
    pairId: `pair-${id}`,
    mismatches,
    hadFriction,
  };
}

describe("Phase 1.G Outcome-Trained Weights Optimizer", () => {
  it("strictly refuses to fit when sample size is below the 200 threshold", () => {
    const smallRecords: OutcomeRecord[] = [];
    for (let i = 0; i < 150; i++) {
      smallRecords.push(generateRecord(String(i), i % 2 === 0));
    }

    const res = fitOutcomeWeights(smallRecords);
    expect(res.status).toBe("insufficient_data");
    expect(res.sampleSize).toBe(150);
    expect(res.message).toContain(`Needs at least ${MIN_OUTCOME_SAMPLE_SIZE}`);
  });

  it("fits regularized logistic model on >=200 records and recovers planted sleep effect", () => {
    // Generate 300 records with planted sleep effect
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 300; i++) {
      records.push(generateRecord(String(i), i % 3 === 0));
    }

    const res = fitOutcomeWeights(records);
    expect(res.status).toBe("success");
    expect(res.sampleSize).toBe(300);
    expect(res.frictionCount).toBeGreaterThan(0);

    // Sleep coefficient should be positive and substantially higher than noise factors
    const sleepWeight = res.coefficients.sleep.weight;
    const studyWeight = res.coefficients.study.weight;
    expect(sleepWeight).toBeGreaterThan(0);
    expect(sleepWeight).toBeGreaterThan(studyWeight);

    // Sleep should be recommended as highest importance (3)
    expect(res.suggestedWeights.sleep).toBe(3);
    expect(res.coefficients.sleep.ciHigh).toBeGreaterThan(res.coefficients.sleep.ciLow);
  });
});
