/**
 * Pulse check-in schedule (Phase 5). Pure. Week 2, 4 and 8 by default, then monthly until
 * the term ends; schools can change the offsets.
 */
export const DEFAULT_OFFSETS = [14, 28, 56];

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Due dates (yyyy-mm-dd) from move-in through `until` (term end, or a year without one). */
export function checkinDueDates(
  movedIn: string,
  options: { offsets?: number[]; monthlyAfter?: boolean; until?: string | null } = {},
): string[] {
  const offsets = [...new Set((options.offsets?.length ? options.offsets : DEFAULT_OFFSETS).filter((n) => n > 0))].sort((a, b) => a - b);
  const until = options.until ?? addDays(movedIn, 365);
  const dates = offsets.map((n) => addDays(movedIn, n)).filter((d) => d <= until);
  if (options.monthlyAfter !== false) {
    const last = addDays(movedIn, offsets[offsets.length - 1] ?? 0);
    for (let m = 1; m <= 12; m++) {
      const next = addMonths(last, m);
      if (next > until) break;
      dates.push(next);
    }
  }
  return dates;
}
