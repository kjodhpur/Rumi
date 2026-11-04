/**
 * Room-change reason analytics (1.B). Pure: parses public.staff_room_changes and bands
 * scores. Counts of 1–4 arrive as null and read "<5".
 */

export const SCORE_BANDS = ["<50", "50-69", "70-84", "85+", "unknown"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];
export const BAND_LABEL: Record<ScoreBand, string> = {
  "<50": "Under 50",
  "50-69": "50–69",
  "70-84": "70–84",
  "85+": "85 and up",
  unknown: "No score",
};

export function scoreBand(score: number | null): ScoreBand {
  if (score === null || !Number.isFinite(score)) return "unknown";
  if (score < 50) return "<50";
  if (score < 70) return "50-69";
  if (score < 85) return "70-84";
  return "85+";
}

export interface RoomChangeStats {
  total: number | null;
  untagged: number | null;
  byReason: { key: string; n: number | null }[];
  byMonth: { month: string; key: string; n: number | null }[];
  byBuilding: { building: string; n: number | null }[];
  byBand: {
    band: ScoreBand;
    requests: number | null;
    assigned: number | null;
    rate: number | null;
  }[];
  byAgreement: { signed: "true" | "false" | "unknown"; n: number | null }[];
}

const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown, fallback = "unknown") => (typeof v === "string" ? v : fallback);

export function parseRoomChangeStats(raw: unknown): RoomChangeStats {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total: num(r.total),
    untagged: num(r.untagged),
    byReason: arr(r.byReason).map((x) => ({ key: str(x.key), n: num(x.n) })),
    byMonth: arr(r.byMonth).map((x) => ({ month: str(x.month), key: str(x.key), n: num(x.n) })),
    byBuilding: arr(r.byBuilding).map((x) => ({ building: str(x.building), n: num(x.n) })),
    byBand: arr(r.byBand).map((x) => ({
      band: (SCORE_BANDS as readonly string[]).includes(str(x.band))
        ? (str(x.band) as ScoreBand)
        : "unknown",
      requests: num(x.requests),
      assigned: num(x.assigned),
      rate: num(x.rate),
    })),
    byAgreement: arr(r.byAgreement).map((x) => ({
      signed: x.signed === "true" ? "true" : x.signed === "false" ? "false" : "unknown",
      n: num(x.n),
    })),
  };
}

/** Requests per month, summed across reasons; a month with any suppressed reason is suppressed. */
export function monthlyTotals(
  byMonth: RoomChangeStats["byMonth"],
): { month: string; n: number | null }[] {
  const months = new Map<string, number | null>();
  for (const m of byMonth) {
    const prev = months.has(m.month) ? months.get(m.month)! : 0;
    months.set(m.month, prev === null || m.n === null ? null : prev + m.n);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, n]) => ({ month, n }));
}

/** Tags: 1–3 distinct, active keys from the school's list. */
export function validTags(keys: string[], active: string[]): boolean {
  const set = new Set(keys);
  return (
    set.size === keys.length &&
    keys.length >= 1 &&
    keys.length <= 3 &&
    keys.every((k) => active.includes(k))
  );
}
