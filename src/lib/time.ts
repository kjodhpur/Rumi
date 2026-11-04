/**
 * Time formatting that is identical on server and client during hydration.
 * The server renders in the campus time zone; once mounted, components switch
 * to the viewer's own zone (usually the same for students on campus).
 */
export const CAMPUS_TZ = process.env.NEXT_PUBLIC_CAMPUS_TZ ?? "America/Phoenix";

function zone(local: boolean) {
  return local ? undefined : CAMPUS_TZ;
}

/** Words the formatters need, per language (dates and times come from Intl). */
const WORDS: Record<
  string,
  {
    today: string;
    yesterday: string;
    now: string;
    ago: (n: number, unit: "m" | "h" | "d") => string;
  }
> = {
  en: { today: "Today", yesterday: "Yesterday", now: "just now", ago: (n, u) => `${n}${u} ago` },
  es: {
    today: "Hoy",
    yesterday: "Ayer",
    now: "ahora",
    ago: (n, u) => `hace ${n} ${u === "m" ? "min" : u}`,
  },
};
const words = (intl: string) => WORDS[intl.slice(0, 2)] ?? WORDS.en!;

export function formatTime(iso: string, local: boolean, intl = "en-US") {
  return new Intl.DateTimeFormat(intl, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone(local),
  }).format(new Date(iso));
}

function dayKey(date: Date, local: boolean) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone(local),
  }).format(date);
}

export function sameDay(a: string, b: string, local: boolean) {
  return dayKey(new Date(a), local) === dayKey(new Date(b), local);
}

function dayKind(iso: string, local: boolean, now: number): "today" | "yesterday" | null {
  const key = dayKey(new Date(iso), local);
  if (key === dayKey(new Date(now), local)) return "today";
  if (key === dayKey(new Date(now - 86_400_000), local)) return "yesterday";
  return null;
}

/** "Today", "Yesterday", "Monday, Oct 20". */
export function dayLabel(iso: string, local: boolean, now = Date.now(), intl = "en-US") {
  const kind = dayKind(iso, local, now);
  if (kind) return words(intl)[kind];
  return new Intl.DateTimeFormat(intl, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: zone(local),
  }).format(new Date(iso));
}

/** Inbox-style stamp: time today, "Yesterday", weekday this week, else "Oct 20". */
export function listStamp(iso: string | null, local: boolean, now = Date.now(), intl = "en-US") {
  if (!iso) return "";
  const d = new Date(iso);
  const kind = dayKind(iso, local, now);
  if (kind === "today") return formatTime(iso, local, intl);
  if (kind === "yesterday") return words(intl).yesterday;
  if (now - d.getTime() < 6 * 86_400_000) {
    return new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: zone(local) }).format(d);
  }
  return new Intl.DateTimeFormat(intl, {
    month: "short",
    day: "numeric",
    timeZone: zone(local),
  }).format(d);
}

export function fullStamp(iso: string, local: boolean, intl = "en-US") {
  return new Intl.DateTimeFormat(intl, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone(local),
  }).format(new Date(iso));
}

/** "just now", "5m ago", "3h ago", "2d ago", "Oct 20" — relative to `now`. */
export function relative(iso: string, now: number, intl = "en-US") {
  const w = words(intl);
  const diff = Math.max(0, now - Date.parse(iso));
  const m = Math.floor(diff / 60_000);
  if (m < 1) return w.now;
  if (m < 60) return w.ago(m, "m");
  const h = Math.floor(m / 60);
  if (h < 24) return w.ago(h, "h");
  const d = Math.floor(h / 24);
  if (d < 7) return w.ago(d, "d");
  return new Intl.DateTimeFormat(intl, { month: "short", day: "numeric" }).format(new Date(iso));
}

/** Formats a calendar date ("2027-08-01") without time-zone drift. Returns null when unparseable. */
export function formatCalendarDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
  intl = "en-US",
) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(intl, { ...options, timeZone: "UTC" }).format(parsed);
}

/** Today's date on campus, yyyy-mm-dd. */
export function campusToday(now: Date = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });
}
