import type { FactorKey, Importance } from "@/lib/options";

export const LIFESTYLE_FACTORS: FactorKey[] = [
  "sleep",
  "cleanliness",
  "noise",
  "guests",
  "smoking",
  "drinking",
  "pets",
  "study",
];

export interface OutcomeRecord {
  /** Roommate pair ID */
  pairId: string;
  /** Normalized mismatch differences 0-1 for each factor */
  mismatches: Record<FactorKey, number>;
  /** Negative outcome occurred: room change request or check-in <= 2 */
  hadFriction: boolean;
}

export interface FactorCoefficient {
  factor: FactorKey;
  weight: number; // learned beta
  standardError: number;
  ciLow: number;
  ciHigh: number;
  suggestedImportance: Importance;
}

export interface FitResult {
  status: "success" | "insufficient_data";
  sampleSize: number;
  frictionCount: number;
  frictionRate: number;
  intercept: number;
  coefficients: Record<FactorKey, FactorCoefficient>;
  suggestedWeights: Record<FactorKey, Importance>;
  message?: string;
}

export const MIN_OUTCOME_SAMPLE_SIZE = 200;

function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Fits an L2-regularized logistic regression model to predict roommate friction
 * from factor mismatches. Strictly refuses when sample size < 200.
 */
export function fitOutcomeWeights(
  records: OutcomeRecord[],
  lambda: number = 1.0,
): FitResult {
  const n = records.length;
  if (n < MIN_OUTCOME_SAMPLE_SIZE) {
    return {
      status: "insufficient_data",
      sampleSize: n,
      frictionCount: records.filter((r) => r.hadFriction).length,
      frictionRate: n > 0 ? records.filter((r) => r.hadFriction).length / n : 0,
      intercept: 0,
      coefficients: {} as Record<FactorKey, FactorCoefficient>,
      suggestedWeights: {} as Record<FactorKey, Importance>,
      message: `Needs at least ${MIN_OUTCOME_SAMPLE_SIZE} outcome records to fit regularized model (received ${n}).`,
    };
  }

  const factors = LIFESTYLE_FACTORS;
  const numFeatures = factors.length;
  const frictionCount = records.filter((r) => r.hadFriction).length;
  const frictionRate = frictionCount / n;

  // Initialize weights and bias
  let bias = Math.log(frictionRate / Math.max(1e-4, 1 - frictionRate));
  const weights = new Array<number>(numFeatures).fill(0);

  // Gradient descent parameters
  const iterations = 400;
  const lr = 0.15;

  for (let it = 0; it < iterations; it++) {
    const gradW = new Array<number>(numFeatures).fill(0);
    let gradB = 0;

    for (const record of records) {
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * (record.mismatches[factors[j]] ?? 0);
      }
      const p = sigmoid(z);
      const y = record.hadFriction ? 1 : 0;
      const err = p - y;

      gradB += err;
      for (let j = 0; j < numFeatures; j++) {
        gradW[j] += err * (record.mismatches[factors[j]] ?? 0);
      }
    }

    // Apply regularization to weights (not bias)
    bias -= (lr * gradB) / n;
    for (let j = 0; j < numFeatures; j++) {
      gradW[j] = gradW[j] / n + (lambda * weights[j]) / n;
      weights[j] -= lr * gradW[j];
    }
  }

  // Calculate approximate standard errors & map to 0-3 importance
  const maxWeight = Math.max(...weights.filter((w) => w > 0), 0.1);
  const coefficients: Partial<Record<FactorKey, FactorCoefficient>> = {};
  const suggestedWeights: Partial<Record<FactorKey, Importance>> = {};

  for (let j = 0; j < numFeatures; j++) {
    const factor = factors[j];
    const w = weights[j];
    // Approximate standard error: inversely proportional to sqrt(n)
    const se = Math.max(0.01, 1.96 / Math.sqrt(n));
    const ciLow = Math.round((w - 1.96 * se) * 1000) / 1000;
    const ciHigh = Math.round((w + 1.96 * se) * 1000) / 1000;

    // Map positive predictive weights to 0-3 scale:
    // 0: negligible or non-positive (< 0.1 * max)
    // 1: low (0.1 to 0.4 * max)
    // 2: medium (0.4 to 0.7 * max)
    // 3: high (> 0.7 * max)
    let importance: Importance = 0;
    if (w > 0.7 * maxWeight) {
      importance = 3;
    } else if (w > 0.4 * maxWeight) {
      importance = 2;
    } else if (w > 0.1 * maxWeight) {
      importance = 1;
    }

    coefficients[factor] = {
      factor,
      weight: Math.round(w * 1000) / 1000,
      standardError: Math.round(se * 1000) / 1000,
      ciLow,
      ciHigh,
      suggestedImportance: importance,
    };
    suggestedWeights[factor] = importance;
  }

  return {
    status: "success",
    sampleSize: n,
    frictionCount,
    frictionRate: Math.round(frictionRate * 1000) / 1000,
    intercept: Math.round(bias * 1000) / 1000,
    coefficients: coefficients as Record<FactorKey, FactorCoefficient>,
    suggestedWeights: suggestedWeights as Record<FactorKey, Importance>,
  };
}
