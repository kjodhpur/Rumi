/**
 * Shared room calendar (Phase 4.2). Pure: weekly repeats, the agreement's overnight-guest
 * limit and quiet-hours overlap. Times are UTC instants; "this week" is the Monday–Sunday
 * week in the campus time zone.
 */

export type RoomEventKind = "guest" | "quiet" | "away" | "shared";

export interface RoomEvent {
  id: string;
  kind: RoomEventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  overnight: boolean;
  guestCount: number;
  /** RFC 5545 weekly rule, e.g. "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261215T000000Z". */
  rrule: string | null;
}

export interface Occurrence {
  eventId: string;
  startsAt: string;
  endsAt: string;
}

export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DAY = 86_400_000;
const RRULE =
  /^FREQ=WEEKLY(;BYDAY=((MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU)){0,6}))?(;UNTIL=(\d{8}T\d{6}Z))?$/;

export function buildWeeklyRule(days: Weekday[], until: string | null): string {
  const unique = WEEKDAYS.filter((d) => days.includes(d));
  let rule = "FREQ=WEEKLY";
  if (unique.length) rule += `;BYDAY=${unique.join(",")}`;
  if (until) rule += `;UNTIL=${until.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
  return rule;
}

export function parseWeeklyRule(rrule: string): { days: Weekday[]; until: Date | null } | null {
  const m = RRULE.exec(rrule);
  if (!m) return null;
  const days = m[2] ? (m[2].split(",") as Weekday[]) : [];
  const until = m[7]
    ? new Date(
        `${m[7].slice(0, 4)}-${m[7].slice(4, 6)}-${m[7].slice(6, 8)}T${m[7].slice(9, 11)}:${m[7].slice(11, 13)}:${m[7].slice(13, 15)}Z`,
      )
    : null;
  return { days, until };
}

/** Monday = 0 … Sunday = 6, for a UTC instant. */
function utcWeekday(ms: number) {
  return (new Date(ms).getUTCDay() + 6) % 7;
}

/**
 * Every occurrence that overlaps [from, to). A weekly rule repeats the first occurrence's
 * time of day on each listed weekday (in UTC, which is what the .ics feed says too).
 */
export function occurrences(event: RoomEvent, from: Date, to: Date): Occurrence[] {
  const start = Date.parse(event.startsAt);
  const length = Date.parse(event.endsAt) - start;
  const overlaps = (s: number) => s < to.getTime() && s + length > from.getTime();
  if (!event.rrule) {
    return overlaps(start)
      ? [{ eventId: event.id, startsAt: event.startsAt, endsAt: event.endsAt }]
      : [];
  }
  const rule = parseWeeklyRule(event.rrule);
  if (!rule) return [];
  const days = rule.days.length ? rule.days.map((d) => WEEKDAYS.indexOf(d)) : [utcWeekday(start)];
  const end = Math.min(to.getTime(), rule.until ? rule.until.getTime() + 1 : Infinity);
  const out: Occurrence[] = [];
  // Walk day by day from the first occurrence; cheap for the ranges a room calendar shows.
  const firstDay = start - (start % DAY);
  const offset = start - firstDay;
  for (
    let day = Math.max(firstDay, from.getTime() - length - (from.getTime() % DAY) - DAY);
    day < end;
    day += DAY
  ) {
    if (!days.includes(utcWeekday(day))) continue;
    const s = day + offset;
    if (s < start || s >= end) continue;
    if (overlaps(s))
      out.push({
        eventId: event.id,
        startsAt: new Date(s).toISOString(),
        endsAt: new Date(s + length).toISOString(),
      });
    if (out.length > 500) break;
  }
  return out;
}

/** The campus-time Monday (yyyy-mm-dd) of the week an instant falls in. */
export function campusWeekKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const date = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  return new Date(date - Math.max(0, weekday) * DAY).toISOString().slice(0, 10);
}

/** "Overnight guests at most 2 nights a week" → 2; "No overnight guests …" → 0. */
export function agreementOvernightLimit(guestSection: string | null | undefined): number | null {
  if (!guestSection) return null;
  if (/\bno overnight guests\b/i.test(guestSection)) return 0;
  const m = /overnight guests?[^.]*?\bat most (\d+|one|two|three|four|five)\b/i.exec(guestSection);
  if (!m) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  return words[m[1]!.toLowerCase()] ?? Number(m[1]);
}

const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Soft warning when an overnight guest goes past the agreement's weekly limit. */
export function guestLimitWarning(
  target: Pick<RoomEvent, "kind" | "startsAt" | "endsAt" | "overnight" | "rrule">,
  existing: RoomEvent[],
  limit: number | null,
  timeZone: string,
): string | null {
  if (target.kind !== "guest" || !target.overnight || limit === null) return null;
  const week = campusWeekKey(target.startsAt, timeZone);
  const from = new Date(Date.parse(target.startsAt) - 8 * DAY);
  const to = new Date(Date.parse(target.startsAt) + 8 * DAY);
  let count = 1;
  for (const event of existing) {
    if (event.kind !== "guest" || !event.overnight) continue;
    for (const o of occurrences(event, from, to))
      if (campusWeekKey(o.startsAt, timeZone) === week) count += 1;
  }
  if (count <= limit) return null;
  return limit === 0
    ? "Your agreement says no overnight guests. Talk with your roommates first."
    : `This would be the ${ordinal(count)} overnight this week; your agreement says ${limit}.`;
}

/** Quiet or exam times a new guest or shared event runs into (titles, deduped). */
export function quietOverlaps(
  target: Pick<RoomEvent, "kind" | "startsAt" | "endsAt">,
  existing: RoomEvent[],
): string[] {
  if (target.kind !== "guest" && target.kind !== "shared") return [];
  const from = new Date(target.startsAt);
  const to = new Date(target.endsAt);
  const titles = new Set<string>();
  for (const event of existing) {
    if (event.kind === "quiet" && occurrences(event, from, to).length) titles.add(event.title);
  }
  return [...titles];
}

/** A campus wall-clock time ("2026-11-03T22:00") as a UTC instant. */
export function campusLocalToIso(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const asUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  // The zone's offset at that moment, found by formatting the guess back in the zone.
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - ms;
  };
  const first = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(first)).toISOString();
}

/** A UTC instant as the campus wall-clock value an <input type="datetime-local"> expects. */
export function isoToCampusLocal(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
