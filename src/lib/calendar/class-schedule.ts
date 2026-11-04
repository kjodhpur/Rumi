/**
 * Class schedule (Phase 7.4). Students type their weekly class times or import an .ics
 * export (a Canvas calendar feed or a registration-system schedule). Only weekly blocks
 * are kept: { day 0–6 (Mon = 0), start "HH:MM", end "HH:MM" } in the campus time zone.
 * No course names, rooms or instructors are stored.
 */
import { z } from "zod";

export interface ClassBlock {
  day: number;
  start: string;
  end: string;
}

export const MAX_BLOCKS = 60;
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:30.");

export const classBlockSchema = z
  .object({ day: z.number().int().min(0).max(6), start: hhmm, end: hhmm })
  .refine((b) => b.end > b.start, "A class has to end after it starts.");

export const classBlocksSchema = z
  .array(classBlockSchema)
  .max(MAX_BLOCKS, `Up to ${MAX_BLOCKS} class times.`);

/** Sorted by day then start, with exact duplicates removed. */
export function normalizeBlocks(blocks: ClassBlock[]): ClassBlock[] {
  const seen = new Set<string>();
  const out: ClassBlock[] = [];
  for (const b of [...blocks].sort(
    (x, y) => x.day - y.day || x.start.localeCompare(y.start) || x.end.localeCompare(y.end),
  )) {
    const key = `${b.day}|${b.start}|${b.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out.slice(0, MAX_BLOCKS);
}

/** "Mon, Wed 9:00–10:15" style summary rows, grouped by identical times. */
export function summarizeBlocks(blocks: ClassBlock[]): string[] {
  const byTime = new Map<string, number[]>();
  for (const b of normalizeBlocks(blocks)) {
    const key = `${b.start}–${b.end}`;
    byTime.set(key, [...(byTime.get(key) ?? []), b.day]);
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([time, days]) =>
        `${days.map((d) => DAY_NAMES[d]).join(", ")} ${time.replace(/^0/, "").replace(/–0/, "–")}`,
    );
}

// ── .ics import ─────────────────────────────────────────────────────────────

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfold(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/);
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(":");
  if (colon < 1) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: (name ?? "").toUpperCase(), params, value: line.slice(colon + 1).trim() };
}

/** Wall-clock parts of an instant in a time zone. */
function wallParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    y: Number(get("year")),
    mo: Number(get("month")),
    d: Number(get("day")),
    h: Number(get("hour")),
    mi: Number(get("minute")),
  };
}

/** The instant a wall-clock time in `timeZone` names (two passes handle DST edges). */
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ms = guess;
  for (let i = 0; i < 2; i++) {
    const w = wallParts(ms, timeZone);
    ms += guess - Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi);
  }
  return ms;
}

/** An .ics date-time as an instant, or null for all-day dates and junk. */
function instantOf(prop: Prop | undefined, campusTz: string): number | null {
  if (!prop || prop.params.VALUE === "DATE") return null;
  const m = prop.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1, 6).map(Number) as [number, number, number, number, number];
  if (m[7]) return Date.UTC(y, mo - 1, d, h, mi);
  const zone = prop.params.TZID && isTimeZone(prop.params.TZID) ? prop.params.TZID : campusTz;
  return zonedToUtc(y, mo, d, h, mi, zone);
}

function isTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function durationMs(value: string): number | null {
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [d, h, mi, s] = m.slice(1).map((v) => Number(v ?? 0)) as [number, number, number, number];
  return ((d * 24 + h) * 60 + mi) * 60_000 + s * 1000;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
const BYDAY_INDEX: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
const pad = (n: number) => String(n).padStart(2, "0");

/** Mon = 0 weekday of the calendar date written in an .ics value. */
function localDay(value: string): number | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return (new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay() + 6) % 7;
}

/**
 * Weekly class blocks from an .ics file. Keeps events that repeat weekly (an RRULE, or the
 * same weekday and time at least twice) and last 15 minutes to 6 hours. Drops all-day items
 * and assignment due times, so a Canvas feed full of deadlines yields only real meetings.
 */
export function parseClassIcs(text: string, campusTz: string): ClassBlock[] {
  const events: Prop[][] = [];
  let current: Prop[] | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") current = [];
    else if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const prop = parseProp(line);
      if (prop) current.push(prop);
    }
  }

  const weekly: ClassBlock[] = [];
  const oneOffs = new Map<string, number>();
  for (const props of events) {
    const get = (name: string) => props.find((p) => p.name === name);
    if (get("STATUS")?.value.toUpperCase() === "CANCELLED") continue;
    const start = instantOf(get("DTSTART"), campusTz);
    if (start === null) continue;
    const endProp = get("DTEND");
    const end = endProp
      ? instantOf(endProp, campusTz)
      : get("DURATION")
        ? start + (durationMs(get("DURATION")!.value) ?? 0)
        : null;
    if (end === null) continue;
    const minutes = (end - start) / 60_000;
    if (minutes < 15 || minutes > 360) continue;

    const s = wallParts(start, campusTz);
    const e = wallParts(end, campusTz);
    if (s.d !== e.d) continue; // runs past midnight: not a class
    const block = { start: `${pad(s.h)}:${pad(s.mi)}`, end: `${pad(e.h)}:${pad(e.mi)}` };
    const rrule = get("RRULE")?.value.toUpperCase() ?? "";

    if (/(^|;)FREQ=WEEKLY(;|$)/.test(rrule)) {
      const byday = rrule.match(/(?:^|;)BYDAY=([^;]+)/)?.[1];
      // BYDAY names days in the event's own zone; shift them as far as the start moved.
      const campusDay = WEEKDAY_INDEX[s.weekday] ?? 0;
      const shift = (campusDay - (localDay(get("DTSTART")!.value) ?? campusDay) + 7) % 7;
      const days = byday
        ? byday
            .split(",")
            .map((code) => BYDAY_INDEX[code.replace(/^[+-]?\d+/, "")])
            .filter((d): d is number => d !== undefined)
            .map((d) => (d + shift) % 7)
        : [campusDay];
      for (const day of days) weekly.push({ day, ...block });
    } else {
      const key = `${WEEKDAY_INDEX[s.weekday] ?? 0}|${block.start}|${block.end}`;
      oneOffs.set(key, (oneOffs.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of oneOffs) {
    if (count < 2) continue;
    const [day, start, end] = key.split("|") as [string, string, string];
    weekly.push({ day: Number(day), start, end });
  }
  return normalizeBlocks(weekly);
}
