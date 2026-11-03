import { intervalsDiffer, suppressCount, wilson, type Interval } from "./wilson";

/**
 * Pilot outcomes (Phase 6). Pure: per-student facts in, per-arm aggregates out. Student
 * rows never leave the server; every rendered cell with 1–4 students is suppressed.
 *
 * Only consented or imported data feeds this: check-in scores only from students with the
 * checkins consent, survey answers in aggregate, assignments and room changes from the
 * housing system import or in-app requests.
 */

export type Arm = "rumi" | "control";

export interface OutcomeStudent {
  arm: Arm | null;
  /** Has a housing assignment this term (imported or self-reported). */
  assigned: boolean;
  movedInAt: string | null;
  /** First room-change request this term. */
  firstChangeAt: string | null;
  /** Consented check-in scores only. */
  checkinScores: number[];
  inGroup: boolean;
  agreementSigned: boolean;
  roomAgain: "yes" | "maybe" | "no" | null;
  /** Assigned again in the following term (null until that term's assignments exist). */
  retained: boolean | null;
}

export interface Proportion {
  k: number;
  n: number;
  rate: number | null;
  interval: Interval | null;
  /** True when n or k is 1–4: the numbers aren't shown. */
  suppressed: boolean;
}

export interface ArmMetrics {
  arm: Arm;
  students: number;
  roomChange: Proportion;
  medianDaysToFirstChange: number | null;
  checkinAverage: { value: number | null; n: number; suppressed: boolean };
  agreement: Proportion;
  roomAgain: Proportion;
  retention: Proportion;
}

export function proportion(k: number, n: number): Proportion {
  const suppressed = (n > 0 && n < 5) || (k > 0 && k < 5);
  return { k, n, rate: n > 0 ? k / n : null, interval: n >= 5 ? wilson(k, n) : null, suppressed };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function armMetrics(arm: Arm, students: OutcomeStudent[]): ArmMetrics {
  const mine = students.filter((s) => s.arm === arm);
  const assigned = mine.filter((s) => s.assigned);
  const changed = assigned.filter((s) => s.firstChangeAt);
  const days = changed
    .filter((s) => s.movedInAt)
    .map((s) => Math.max(0, Math.round((Date.parse(s.firstChangeAt!) - Date.parse(`${s.movedInAt}T00:00:00Z`)) / 86_400_000)));
  const scores = mine.flatMap((s) => (s.checkinScores.length ? [s.checkinScores.reduce((a, b) => a + b, 0) / s.checkinScores.length] : []));
  const grouped = mine.filter((s) => s.inGroup);
  const surveyed = mine.filter((s) => s.roomAgain !== null);
  const retainable = assigned.filter((s) => s.retained !== null);
  return {
    arm,
    students: mine.length,
    roomChange: proportion(changed.length, assigned.length),
    medianDaysToFirstChange: changed.length >= 5 ? median(days) : null,
    checkinAverage: { value: scores.length >= 5 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null, n: scores.length, suppressed: scores.length > 0 && scores.length < 5 },
    agreement: proportion(grouped.filter((s) => s.agreementSigned).length, grouped.length),
    roomAgain: proportion(surveyed.filter((s) => s.roomAgain === "yes").length, surveyed.length),
    retention: proportion(retainable.filter((s) => s.retained).length, retainable.length),
  };
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf). */
function normalCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export interface Comparison {
  /** Two-sided p-value of a pooled two-proportion z-test; null when it can't be run. */
  p: number | null;
  significant: boolean;
  /** Plain-language label for the report. */
  label: string;
}

/** Rumi vs. control on one proportion. Needs 5+ in each arm; never on suppressed cells. */
export function compareProportions(a: Proportion, b: Proportion, alpha = 0.05): Comparison {
  if (a.n < 5 || b.n < 5) return { p: null, significant: false, label: "Not enough students to compare" };
  const pooled = (a.k + b.k) / (a.n + b.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.n + 1 / b.n));
  if (se === 0) return { p: 1, significant: false, label: "Not statistically significant" };
  const z = (a.k / a.n - b.k / b.n) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = p < alpha;
  return { p: Math.round(p * 1000) / 1000, significant, label: significant ? `Statistically significant (p = ${p < 0.001 ? "<0.001" : p.toFixed(3)})` : "Not statistically significant" };
}

export type ScoreBand = "<50" | "50-69" | "70-84" | "85+";

export function scoreBand(score: number | null): ScoreBand | "unknown" {
  if (score === null) return "unknown";
  if (score < 50) return "<50";
  if (score < 70) return "50-69";
  if (score < 85) return "70-84";
  return "85+";
}

export interface DeidentifiedRow {
  arm: string;
  scoreBand: string;
  agreementSigned: "Y" | "N" | "";
  checkinAverage: string;
  roomChange: "Y" | "N";
  roomAgain: string;
}

/** De-identified research rows (only students with research_outcomes consent). No ids or dates. */
export function deidentifiedCsv(rows: DeidentifiedRow[]): string {
  const header = "arm,score_band,agreement_signed,checkin_average,room_change,room_again";
  // Shuffle-free but sorted, so row order can't be joined back to sign-up order.
  const lines = rows
    .map((r) => [r.arm, r.scoreBand, r.agreementSigned, r.checkinAverage, r.roomChange, r.roomAgain].join(","))
    .sort();
  return [header, ...lines].join("\r\n") + "\r\n";
}

/** Display helper: "<5", a percentage, or "—". */
export function formatProportion(p: Proportion): string {
  if (p.n === 0) return "—";
  if (p.suppressed) return "<5";
  return `${Math.round((p.rate ?? 0) * 100)}%`;
}

export { wilson, suppressCount, intervalsDiffer };
