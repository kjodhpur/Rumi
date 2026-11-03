import type { RoomEvent } from "./room";

/** UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ. */
export function formatIcsDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes text per RFC 5545 §3.3.11. */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

const KIND_LABEL: Record<RoomEvent["kind"], string> = {
  guest: "Guest",
  quiet: "Quiet hours",
  away: "Away",
  shared: "Room event",
};

/** A VCALENDAR feed of the room's events; weekly repeats keep their RRULE. */
export function generateIcsFeed(
  calendarTitle: string,
  events: (RoomEvent & { notes?: string | null; createdByName?: string | null })[],
  now: Date = new Date(),
): string {
  const stamp = formatIcsDate(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rumi//Room calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarTitle)}`,
  ];
  for (const ev of events) {
    const label = ev.kind === "guest" && ev.overnight ? "Overnight guest" : KIND_LABEL[ev.kind];
    const details = [
      ev.createdByName ? `Added by ${ev.createdByName}` : null,
      ev.kind === "guest" && ev.guestCount > 0 ? `${ev.guestCount} ${ev.guestCount === 1 ? "guest" : "guests"}` : null,
      ev.notes || null,
    ].filter(Boolean);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@rumimatch.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(ev.startsAt)}`,
      `DTEND:${formatIcsDate(ev.endsAt)}`,
      ...(ev.rrule ? [`RRULE:${ev.rrule}`] : []),
      `SUMMARY:${escapeIcsText(`${label}: ${ev.title}`)}`,
      ...(details.length ? [`DESCRIPTION:${escapeIcsText(details.join("\n"))}`] : []),
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A single all-day event (move-in day, agreement due) as a downloadable .ics (Phase 7.3 b). */
export function singleEventIcs(input: { uid: string; title: string; date: string; description?: string }, now: Date = new Date()): string {
  const day = input.date.replace(/-/g, "");
  const next = new Date(Date.parse(`${input.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rumi//Deadlines//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@rumimatch.app`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeIcsText(input.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}
