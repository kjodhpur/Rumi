/**
 * Segment analytics (1.A). Pure: labels, formatting and suppression for rows from
 * public.staff_segments. Counts under 5 arrive as null from the database and read "<5".
 */
import { CLASS_YEARS, HOUSING_TYPES } from "@/lib/options";

export const SEGMENT_DIMENSIONS = [
  { key: "class_year", label: "Class year" },
  { key: "academic_college", label: "Academic college" },
  { key: "residential_college", label: "Residential college" },
  { key: "llc", label: "Living learning community" },
  { key: "campus", label: "Campus" },
  { key: "gender_inclusive", label: "Gender-inclusive interest" },
  { key: "housing_type", label: "On or off campus" },
  { key: "track", label: "Track" },
  { key: "pre_arrival", label: "Pre-arrival or enrolled" },
] as const;
export type SegmentDimension = (typeof SEGMENT_DIMENSIONS)[number]["key"];

export const SEGMENT_METRICS = [
  { key: "onboarding", label: "Finished profile", kind: "rate", of: "students" },
  { key: "matched", label: "In a pair or group", kind: "rate", of: "finished profiles" },
  { key: "best_score", label: "Median best score", kind: "score", of: "students with matches" },
  { key: "intro_acceptance", label: "Intros accepted", kind: "rate", of: "intros sent" },
  { key: "agreement", label: "Signed agreement", kind: "rate", of: "students in a group" },
  {
    key: "checkin_avg",
    label: "Check-in average",
    kind: "average",
    of: "students who shared check-ins",
  },
  { key: "room_change", label: "Asked to change rooms", kind: "rate", of: "assigned students" },
] as const;
export type SegmentMetric = (typeof SEGMENT_METRICS)[number]["key"];

export interface SegmentRow {
  value: string;
  n: number | null;
  numerator: number | null;
  rate: number | null;
  average: number | null;
  suppressed: boolean;
  /**
   * Hidden even though it isn't small, so a single small segment can't be worked out as the
   * total minus the others (complementary suppression).
   */
  complementary?: boolean;
}

export function isDimension(v: string | undefined): v is SegmentDimension {
  return SEGMENT_DIMENSIONS.some((d) => d.key === v);
}
export function isMetric(v: string | undefined): v is SegmentMetric {
  return SEGMENT_METRICS.some((m) => m.key === v);
}
export const metricInfo = (m: SegmentMetric) => SEGMENT_METRICS.find((x) => x.key === m)!;

const FIXED: Partial<Record<SegmentDimension, Record<string, string>>> = {
  class_year: Object.fromEntries(CLASS_YEARS.map((c) => [c.value, c.label])),
  housing_type: Object.fromEntries(HOUSING_TYPES.map((c) => [c.value, c.label])),
  track: { freshman: "First-year", returning: "Returning", transfer: "Transfer", grad: "Graduate" },
  gender_inclusive: { yes: "Interested", no: "Not interested" },
  pre_arrival: { pre_arrival: "Pre-arrival", enrolled: "Enrolled" },
};

/** School option lists label colleges, LLCs and campuses; "unknown" means the student didn't say. */
export function segmentLabel(
  dimension: SegmentDimension,
  value: string,
  options: Record<string, string> = {},
) {
  if (value === "unknown") return dimension === "llc" ? "No LLC" : "Not given";
  return FIXED[dimension]?.[value] ?? options[value] ?? value;
}

/** The bar length on a 0–1 scale, or null when the value is suppressed. */
export function barValue(row: SegmentRow, metric: SegmentMetric): number | null {
  const kind = metricInfo(metric).kind;
  if (row.suppressed || row.n === null) return null;
  if (kind === "rate") return row.rate;
  if (kind === "score") return row.average === null ? null : row.average / 100;
  return row.average === null ? null : row.average / 5;
}

export function displayValue(row: SegmentRow, metric: SegmentMetric): string {
  const kind = metricInfo(metric).kind;
  if (row.complementary) return "Hidden";
  if (row.n === null) return "<5";
  if (kind === "rate")
    return row.rate === null
      ? row.numerator === null
        ? "<5"
        : "—"
      : `${Math.round(row.rate * 100)}%`;
  if (row.average === null) return "—";
  return kind === "score" ? String(Math.round(row.average)) : row.average.toFixed(1);
}

export const displayCount = (n: number | null, complementary = false) =>
  complementary ? "Hidden" : n === null ? "<5" : n.toLocaleString("en-US");

/** Up to three values to compare, kept in the order the table shows them. */
export function compareSet(raw: string | undefined, available: string[]): string[] {
  const wanted = new Set((raw ?? "").split(",").filter(Boolean));
  return available.filter((v) => wanted.has(v)).slice(0, 3);
}
