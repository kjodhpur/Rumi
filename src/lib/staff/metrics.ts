/**
 * Staff metrics: shapes returned by `staff_overview`, plus the small-number
 * suppression every staff screen uses. Pure, so the privacy rule is unit-tested.
 */

export interface OverviewKpis {
  students: number;
  verified: number;
  onboarded: number;
  withStrongMatch: number;
  matched: number;
  introsSent: number;
  introsAccepted: number;
  medianDaysToMatch: number | null;
  unmatched: number;
  openReports: number;
}

export type FunnelStage =
  "signed_up" | "verified" | "onboarded" | "intro" | "intro_accepted" | "matched";

export interface Overview {
  kpis: OverviewKpis;
  funnel: { stage: FunnelStage; n: number }[];
  weekly: { week: string; signups: number; onboarded: number; matched: number }[];
  distribution: { bin: ScoreBin; n: number }[];
  segments: { dimension: "class_year" | "housing_type"; value: string; bin: ScoreBin; n: number }[];
}

export const SCORE_BINS = ["none", "0-49", "50-59", "60-69", "70-79", "80-89", "90-100"] as const;
export type ScoreBin = (typeof SCORE_BINS)[number];

export const BIN_LABELS: Record<ScoreBin, string> = {
  none: "None",
  "0-49": "<50",
  "50-59": "50s",
  "60-69": "60s",
  "70-79": "70s",
  "80-89": "80s",
  "90-100": "90+",
};

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  signed_up: "Signed up",
  verified: "Verified",
  onboarded: "Finished profile",
  intro: "Sent or got an intro",
  intro_accepted: "Had an intro accepted",
  matched: "In a pair or group",
};

/** Any group smaller than this is shown as "<5" so no individual can be singled out. */
export const SUPPRESS_BELOW = 5;

export function isSuppressed(n: number) {
  return n > 0 && n < SUPPRESS_BELOW;
}

/** A count for display: "<5" for 1–4, otherwise the grouped number. */
export function count(n: number): string {
  return isSuppressed(n) ? "<5" : n.toLocaleString("en-US");
}

/**
 * A share for display. Under 5 students in the denominator there's no meaningful rate ("—");
 * a numerator of 1–4 would single people out, so it's shown as "<5" students instead.
 */
export function share(numerator: number, denominator: number): string {
  if (denominator < SUPPRESS_BELOW) return "—";
  if (isSuppressed(numerator)) return "<5";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function days(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value < 1 ? "<1 day" : `${Math.round(value)} ${Math.round(value) === 1 ? "day" : "days"}`;
}

/** Rows for the by-segment table: one per segment value, a count per bin, suppressed. */
export function segmentTable(
  segments: Overview["segments"],
  dimension: "class_year" | "housing_type",
) {
  const values = [
    ...new Set(segments.filter((s) => s.dimension === dimension).map((s) => s.value)),
  ];
  return values.map((value) => {
    const cells = Object.fromEntries(SCORE_BINS.map((bin) => [bin, 0])) as Record<ScoreBin, number>;
    for (const s of segments)
      if (s.dimension === dimension && s.value === value) cells[s.bin] = s.n;
    const total = Object.values(cells).reduce((a, b) => a + b, 0);
    return { value, cells, total };
  });
}
