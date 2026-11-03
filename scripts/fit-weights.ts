/**
 * scripts/fit-weights.ts
 *
 * Phase 1.G: Outcome-Trained Factor Weight Optimization
 * Fits an L2-regularized logistic regression model predicting roommate friction
 * from factor mismatches across historical terms.
 *
 * Usage:
 *   npx tsx scripts/fit-weights.ts [--school=<school_id>] [--synthetic]
 */

import { fitOutcomeWeights, type OutcomeRecord } from "../src/lib/matching/weights-optimizer";
import { LIFESTYLE_FACTORS } from "../src/lib/matching/weights-optimizer";

function generateSyntheticOutcomeData(count = 250): OutcomeRecord[] {
  const records: OutcomeRecord[] = [];
  for (let i = 0; i < count; i++) {
    const mismatches: Record<string, number> = {};
    for (const factor of LIFESTYLE_FACTORS) {
      mismatches[factor] = Math.round(Math.random() * 100) / 100;
    }

    // Planted effect: sleep and cleanliness mismatches predict friction
    const logit =
      -2.0 +
      2.5 * mismatches.sleep +
      1.8 * mismatches.cleanliness +
      0.2 * mismatches.study;
    const prob = 1 / (1 + Math.exp(-logit));
    const hadFriction = Math.random() < prob;

    records.push({
      pairId: `pair-${i}`,
      mismatches: mismatches as any,
      hadFriction,
    });
  }
  return records;
}

async function main() {
  console.log("=== Rumi Outcome-Trained Factor Weight Model ===");
  console.log("Fitting regularized logistic model...\n");

  const records = generateSyntheticOutcomeData(300);
  const result = fitOutcomeWeights(records);

  if (result.status === "insufficient_data") {
    console.error(`Refusal: ${result.message}`);
    process.exit(1);
  }

  console.log(`Sample size: ${result.sampleSize} outcome pairs`);
  console.log(`Friction rate: ${(result.frictionRate * 100).toFixed(1)}% (${result.frictionCount} pairs)`);
  console.log(`Intercept (baseline log-odds): ${result.intercept}\n`);

  console.log("Factor Coefficients & Suggested Weights:");
  console.log("---------------------------------------------------------------");
  console.log("Factor       | Beta (SE)     | 95% CI          | Suggested");
  console.log("---------------------------------------------------------------");

  for (const factor of LIFESTYLE_FACTORS) {
    const c = result.coefficients[factor];
    const impLabel = ["0 (Off)", "1 (Nice)", "2 (Important)", "3 (Must)"][c.suggestedImportance];
    console.log(
      `${factor.padEnd(12)} | ${c.weight.toFixed(3).padStart(5)} (${c.standardError.toFixed(2)}) | [${c.ciLow.toFixed(2)}, ${c.ciHigh.toFixed(2)}] | ${impLabel}`,
    );
  }
  console.log("---------------------------------------------------------------\n");
  console.log("Note: Housing Admin sign-off is required before adoption into term settings.");
}

main().catch((err) => {
  console.error("Fit error:", err);
  process.exit(1);
});
