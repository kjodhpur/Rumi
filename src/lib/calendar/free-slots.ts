/**
 * "Find a time to meet" (Phase 7.3a). Pure: given everyone's busy times (from connected
 * calendars) and weekly class blocks, suggest a few times that work for all of them. Only
 * the suggestions leave the server; nobody sees anyone else's busy times.
 */
import type { ClassBlock } from "./class-schedule";

export interface Interval {
  start: number;
  end: number;
}

export interface SlotOptions {
  now: number;
  timeZone: string;
  /** How far ahead to look. */
  days?: number;
  /** Meeting length. */
  minutes?: number;
  /** Earliest suggestion, from now. */
  leadMinutes?: number;
  /** Local hours a suggestion may use, "HH:MM". */
  dayStart?: string;
  dayEnd?: string;
  count?: number;
}

const STEP = 30 * 60_000;

const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function local(ms: number, timeZone: string) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  const parts = format.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: WEEKDAY[get("weekday")] ?? 0,
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
};

/**
 * Up to `count` meeting times, spread over different days where possible, inside local
 * waking hours, clear of every busy interval and every class block.
 */
export function suggestSlots(
  busy: Interval[],
  classes: ClassBlock[],
  options: SlotOptions,
): Interval[] {
  const {
    now,
    timeZone,
    days = 7,
    minutes = 60,
    leadMinutes = 120,
    dayStart = "09:00",
    dayEnd = "21:00",
    count = 3,
  } = options;
  const length = minutes * 60_000;
  const open = toMinutes(dayStart);
  const close = toMinutes(dayEnd);
  const blocks = classes.map((c) => ({
    day: c.day,
    start: toMinutes(c.start),
    end: toMinutes(c.end),
  }));
  const sorted = [...busy].sort((a, b) => a.start - b.start);

  const fits = (start: number) => {
    const end = start + length;
    const a = local(start, timeZone);
    const b = local(end - 1, timeZone);
    if (a.date !== b.date || a.minute < open || b.minute + 1 > close) return false;
    if (sorted.some((i) => i.start < end && i.end > start)) return false;
    return !blocks.some((c) => c.day === a.day && c.start < a.minute + minutes && c.end > a.minute);
  };

  const first = Math.ceil((now + leadMinutes * 60_000) / STEP) * STEP;
  const last = now + days * 86_400_000;
  const candidates: { start: number; date: string }[] = [];
  for (let t = first; t + length <= last; t += STEP) {
    if (fits(t)) candidates.push({ start: t, date: local(t, timeZone).date });
  }

  // One per day first, then fill with more on the same days (at least 2 hours apart).
  const picked: number[] = [];
  const usedDays = new Set<string>();
  for (const c of candidates) {
    if (picked.length >= count) break;
    if (usedDays.has(c.date)) continue;
    usedDays.add(c.date);
    picked.push(c.start);
  }
  for (const c of candidates) {
    if (picked.length >= count) break;
    if (picked.some((p) => Math.abs(p - c.start) < 2 * 3_600_000)) continue;
    picked.push(c.start);
  }
  return picked.sort((a, b) => a - b).map((start) => ({ start, end: start + length }));
}
