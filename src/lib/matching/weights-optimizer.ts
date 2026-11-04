import { DEFAULT_IMPORTANCE, type FactorKey, type Importance } from "@/lib/options";

/**
 * Outcome-trained weights (1.G, research mode). Pure.
 *
 * An L2-regularised logistic regression predicts friction (a room-change request, or an
 * end-of-term "wouldn't room again" / low rating) from per-factor mismatch between
 * roommates. Fitted by Newton's method; standard errors come from the inverse of the
 * penalised Hessian at the optimum, so the 95% intervals are Wald intervals.
 *
 * Only the eight lifestyle factors are inputs. No protected attribute (gender, age, race,
 * religion, disability, national origin, family status) is, or can be, a feature.
 */

export const LIFESTYLE_FACTORS = [
  "sleep",
  "cleanliness",
  "noise",
  "guests",
  "smoking",
  "drinking",
  "pets",
  "study",
] as const satisfies readonly FactorKey[];
export type LifestyleFactor = (typeof LIFESTYLE_FACTORS)[number];

export const MIN_OUTCOME_ROWS = 200;
/** Each class needs enough rows for a stable fit. */
export const MIN_EACH_CLASS = 10;

export interface OutcomeRecord {
  /** 0 (same answer) … 1 (opposite ends) per factor. */
  mismatches: Record<LifestyleFactor, number>;
  hadFriction: boolean;
}

export interface FactorEstimate {
  factor: LifestyleFactor;
  coef: number;
  se: number;
  low: number;
  high: number;
  /** "positive": more mismatch → more friction, with the interval above zero. */
  evidence: "positive" | "negative" | "none";
  suggested: Importance;
}

export type FitResult =
  | { status: "insufficient_data"; rows: number; positives: number; message: string }
  | {
      status: "ok";
      rows: number;
      positives: number;
      intercept: number;
      lambda: number;
      /** In-sample area under the ROC curve. */
      auc: number;
      iterations: number;
      estimates: FactorEstimate[];
      suggestedWeights: Record<LifestyleFactor, Importance>;
    };

// ─── Mismatch features ───────────────────────────────────────────────────────

export interface LifestyleAnswers {
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  smoking: string;
  drinking: string;
  pets: string;
  study: string;
}

const ordinal = (order: string[], a: string, b: string) => {
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  return i < 0 || j < 0 ? 0 : Math.abs(i - j) / (order.length - 1);
};

export function pairMismatches(
  a: LifestyleAnswers,
  b: LifestyleAnswers,
): Record<LifestyleFactor, number> {
  const scale = (x: number, y: number) => Math.min(1, Math.abs(x - y) / 4);
  const pets = (x: string, y: string) =>
    x === y ? 0 : x === "none" || y === "none" ? (x === "have" || y === "have" ? 1 : 0.5) : 0.25;
  const study = (x: string, y: string) =>
    x === y
      ? 0
      : (x === "home_quiet" && y === "home_social") || (x === "home_social" && y === "home_quiet")
        ? 1
        : 0.5;
  return {
    sleep: scale(a.sleepSchedule, b.sleepSchedule),
    cleanliness: scale(a.cleanliness, b.cleanliness),
    noise: scale(a.noise, b.noise),
    guests: scale(a.guests, b.guests),
    smoking: ordinal(["never", "sometimes", "regularly"], a.smoking, b.smoking),
    drinking: ordinal(["never", "socially", "often"], a.drinking, b.drinking),
    pets: pets(a.pets, b.pets),
    study: study(a.study, b.study),
  };
}

// ─── Linear algebra (9×9 at most) ────────────────────────────────────────────

/** Gauss–Jordan inverse with partial pivoting; null if singular. */
export function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

/** Mann–Whitney AUC; ties count half. */
export function auc(scores: number[], labels: boolean[]): number {
  const pos = scores.filter((_, i) => labels[i]);
  const neg = scores.filter((_, i) => !labels[i]);
  if (!pos.length || !neg.length) return 0.5;
  let wins = 0;
  for (const p of pos) for (const q of neg) wins += p > q ? 1 : p === q ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

// ─── Fit ─────────────────────────────────────────────────────────────────────

export function fitOutcomeWeights(records: OutcomeRecord[], lambda = 1): FitResult {
  const rows = records.length;
  const positives = records.filter((r) => r.hadFriction).length;
  if (rows < MIN_OUTCOME_ROWS) {
    return {
      status: "insufficient_data",
      rows,
      positives,
      message: `Not enough data: ${rows} outcome rows, and at least ${MIN_OUTCOME_ROWS} are needed.`,
    };
  }
  if (positives < MIN_EACH_CLASS || rows - positives < MIN_EACH_CLASS) {
    return {
      status: "insufficient_data",
      rows,
      positives,
      message: `Not enough data: needs at least ${MIN_EACH_CLASS} pairings with friction and ${MIN_EACH_CLASS} without.`,
    };
  }

  const k = LIFESTYLE_FACTORS.length + 1; // intercept first
  const X = records.map((r) => [1, ...LIFESTYLE_FACTORS.map((f) => r.mismatches[f] ?? 0)]);
  const y = records.map((r) => (r.hadFriction ? 1 : 0));
  const rate = positives / rows;
  const theta = [Math.log(rate / (1 - rate)), ...Array<number>(k - 1).fill(0)];
  let H: number[][] = [];
  let iterations = 0;

  for (; iterations < 100; iterations++) {
    const g = Array<number>(k).fill(0);
    H = Array.from({ length: k }, () => Array<number>(k).fill(0));
    for (let i = 0; i < rows; i++) {
      const p = sigmoid(X[i].reduce((s, x, j) => s + x * theta[j], 0));
      const w = p * (1 - p);
      for (let a = 0; a < k; a++) {
        g[a] += (p - y[i]) * X[i][a];
        for (let b = a; b < k; b++) H[a][b] += w * X[i][a] * X[i][b];
      }
    }
    for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) H[a][b] = H[b][a];
    for (let j = 1; j < k; j++) {
      g[j] += lambda * theta[j];
      H[j][j] += lambda;
    }
    const inv = invert(H);
    if (!inv)
      return {
        status: "insufficient_data",
        rows,
        positives,
        message: "The answers don't vary enough to fit a model.",
      };
    let step = 0;
    for (let a = 0; a < k; a++) {
      const d = inv[a].reduce((s, v, b) => s + v * g[b], 0);
      theta[a] -= d;
      step = Math.max(step, Math.abs(d));
    }
    if (step < 1e-9) break;
  }

  const cov = invert(H);
  if (!cov)
    return {
      status: "insufficient_data",
      rows,
      positives,
      message: "The answers don't vary enough to fit a model.",
    };
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const raw = LIFESTYLE_FACTORS.map((factor, j) => {
    const coef = theta[j + 1];
    const se = Math.sqrt(Math.max(cov[j + 1][j + 1], 0));
    const low = coef - 1.96 * se;
    const high = coef + 1.96 * se;
    return {
      factor,
      coef,
      se,
      low,
      high,
      evidence: (low > 0
        ? "positive"
        : high < 0
          ? "negative"
          : "none") as FactorEstimate["evidence"],
    };
  });

  // Suggested defaults: factors with positive evidence get "Important" (stronger half) or
  // "Nice to have"; everything else keeps Rumi's default. "Must match" is never suggested:
  // that stays each student's own call.
  const strongest = Math.max(0, ...raw.filter((r) => r.evidence === "positive").map((r) => r.coef));
  const estimates: FactorEstimate[] = raw.map((r) => ({
    factor: r.factor,
    coef: round(r.coef),
    se: round(r.se),
    low: round(r.low),
    high: round(r.high),
    evidence: r.evidence,
    suggested:
      r.evidence === "positive" ? (r.coef >= strongest / 2 ? 2 : 1) : DEFAULT_IMPORTANCE[r.factor],
  }));

  return {
    status: "ok",
    rows,
    positives,
    intercept: round(theta[0]),
    lambda,
    auc: round(
      auc(
        X.map((x) => sigmoid(x.reduce((s, v, j) => s + v * theta[j], 0))),
        records.map((r) => r.hadFriction),
      ),
    ),
    iterations: iterations + 1,
    estimates,
    suggestedWeights: Object.fromEntries(estimates.map((e) => [e.factor, e.suggested])) as Record<
      LifestyleFactor,
      Importance
    >,
  };
}

/** A small seeded PRNG so synthetic data (tests, --synthetic) is reproducible. */
export function seededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic outcomes with a known planted effect: log-odds = intercept + Σ effect·mismatch. */
export function plantedOutcomes(
  count: number,
  effects: Partial<Record<LifestyleFactor, number>>,
  intercept = -2,
  seed = 7,
): OutcomeRecord[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const mismatches = Object.fromEntries(
      LIFESTYLE_FACTORS.map((f) => [f, Math.round(rand() * 4) / 4]),
    ) as Record<LifestyleFactor, number>;
    const z =
      intercept + LIFESTYLE_FACTORS.reduce((s, f) => s + (effects[f] ?? 0) * mismatches[f], 0);
    return { mismatches, hadFriction: rand() < sigmoid(z) };
  });
}
