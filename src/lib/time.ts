/**
 * Time formatting that is identical on server and client during hydration.
 * The server renders in the campus time zone; once mounted, components switch
 * to the viewer's own zone (usually the same for students on campus).
 */
export const CAMPUS_TZ = process.env.NEXT_PUBLIC_CAMPUS_TZ ?? "America/Phoenix";

function zone(local: boolean) {
  return local ? undefined : CAMPUS_TZ;
}

export function formatTime(iso: string, local: boolean) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone(local) }).format(new Date(iso));
}

function dayKey(date: Date, local: boolean) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zone(local) }).format(date);
}

export function sameDay(a: string, b: string, local: boolean) {
  return dayKey(new Date(a), local) === dayKey(new Date(b), local);
}

/** "Today", "Yesterday", "Monday, Oct 20". */
export function dayLabel(iso: string, local: boolean, now = Date.now()) {
  const d = new Date(iso);
  const key = dayKey(d, local);
  if (key === dayKey(new Date(now), local)) return "Today";
  if (key === dayKey(new Date(now - 86_400_000), local)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: zone(local) }).format(d);
}

/** Inbox-style stamp: time today, "Yesterday", weekday this week, else "Oct 20". */
export function listStamp(iso: string | null, local: boolean, now = Date.now()) {
  if (!iso) return "";
  const d = new Date(iso);
  const label = dayLabel(iso, local, now);
  if (label === "Today") return formatTime(iso, local);
  if (label === "Yesterday") return label;
  if (now - d.getTime() < 6 * 86_400_000) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: zone(local) }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: zone(local) }).format(d);
}

export function fullStamp(iso: string, local: boolean) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: zone(local) }).format(new Date(iso));
}

/** "just now", "5m", "3h", "2d", "Oct 20" — relative to `now`. */
export function relative(iso: string, now: number) {
  const diff = Math.max(0, now - Date.parse(iso));
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}
