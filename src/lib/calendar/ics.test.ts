import { describe, expect, it } from "vitest";
import { escapeIcsText, formatIcsDate, generateIcsFeed } from "./ics";

describe("ics generation", () => {
  it("formats dates to RFC 5545 UTC representation", () => {
    const formatted = formatIcsDate(new Date("2026-11-10T14:30:00.000Z"));
    expect(formatted).toBe("20261110T143000Z");
  });

  it("escapes special characters", () => {
    expect(escapeIcsText("Hello, world; welcome\nagain")).toBe(
      "Hello\\, world\\; welcome\\nagain",
    );
  });

  it("generates valid VCALENDAR with VEVENT items", () => {
    const ics = generateIcsFeed("Dorm 302 Room Calendar", [
      {
        id: "ev-test-1",
        kind: "quiet",
        title: "Final Exams Quiet",
        startsAt: "2026-11-15T18:00:00Z",
        endsAt: "2026-11-15T22:00:00Z",
        overnight: false,
        guestCount: 0,
        notes: "No loud music or gaming please",
      },
      {
        id: "ev-test-2",
        kind: "guest",
        title: "Alex visiting",
        startsAt: "2026-11-16T21:00:00Z",
        endsAt: "2026-11-17T09:00:00Z",
        overnight: true,
        guestCount: 1,
        notes: "Sleeping on air mattress",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("X-WR-CALNAME:Dorm 302 Room Calendar");
    expect(ics).toContain("UID:ev-test-1@rumi.app");
    expect(ics).toContain("SUMMARY:[Quiet Hours] Final Exams Quiet");
    expect(ics).toContain("SUMMARY:[Guest - Overnight] Alex visiting");
    expect(ics).toContain("END:VCALENDAR");
  });
});
