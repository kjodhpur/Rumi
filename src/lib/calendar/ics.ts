import type { CalendarEvent } from "./conflicts";

/**
 * Formats a Date object into UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ
 */
export function formatIcsDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Escapes characters in text per RFC 5545 section 3.3.11
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates an RFC 5545 compliant VCALENDAR 2.0 text file.
 */
export function generateIcsFeed(
  calendarTitle: string,
  events: (CalendarEvent & { notes?: string | null })[],
): string {
  const now = formatIcsDate(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rumi//Room Hub Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarTitle)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  for (const ev of events) {
    const start = formatIcsDate(ev.startsAt);
    const end = formatIcsDate(ev.endsAt);
    const kindLabel =
      ev.kind === "guest"
        ? `[Guest${ev.overnight ? " - Overnight" : ""}]`
        : ev.kind === "quiet"
          ? "[Quiet Hours]"
          : ev.kind === "away"
            ? "[Away]"
            : "[Shared]";

    const summary = `${kindLabel} ${ev.title}`;
    let description = ev.notes || "";
    if (ev.kind === "guest" && ev.guestCount > 0) {
      description += (description ? " | " : "") + `Guest count: ${ev.guestCount}`;
    }

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@rumi.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
