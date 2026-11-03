import { describe, expect, it } from "vitest";
import { checkCalendarConflicts, type CalendarEvent } from "./conflicts";

describe("calendar conflicts & agreement limits", () => {
  const existingEvents: CalendarEvent[] = [
    {
      id: "ev-1",
      kind: "quiet",
      title: "Midterms Study Block",
      startsAt: "2026-11-10T18:00:00Z",
      endsAt: "2026-11-10T23:00:00Z",
      overnight: false,
      guestCount: 0,
    },
    {
      id: "ev-2",
      kind: "guest",
      title: "Friend visiting",
      startsAt: "2026-11-12T20:00:00Z",
      endsAt: "2026-11-13T10:00:00Z",
      overnight: true,
      guestCount: 1,
    },
    {
      id: "ev-3",
      kind: "guest",
      title: "Sibling stay",
      startsAt: "2026-11-13T20:00:00Z",
      endsAt: "2026-11-14T10:00:00Z",
      overnight: true,
      guestCount: 1,
    },
  ];

  it("detects quiet-hour overlaps for guest events", () => {
    const result = checkCalendarConflicts(
      {
        kind: "guest",
        title: "Study group hangout",
        startsAt: "2026-11-10T19:00:00Z",
        endsAt: "2026-11-10T21:00:00Z",
        overnight: false,
        guestCount: 3,
      },
      existingEvents,
    );

    expect(result.hasWarning).toBe(true);
    expect(result.warnings[0]).toContain('Overlaps with scheduled quiet hours: "Midterms Study Block"');
  });

  it("does not warn if guest event is outside quiet hours", () => {
    const result = checkCalendarConflicts(
      {
        kind: "guest",
        title: "Afternoon project work",
        startsAt: "2026-11-10T13:00:00Z",
        endsAt: "2026-11-10T15:00:00Z",
        overnight: false,
        guestCount: 2,
      },
      existingEvents,
    );

    expect(result.hasWarning).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when overnight guests exceed the weekly agreement limit", () => {
    // 2 overnights already exist (ev-2 and ev-3), so adding a 3rd should flag a warning
    const result = checkCalendarConflicts(
      {
        kind: "guest",
        title: "Another friend overnight",
        startsAt: "2026-11-14T21:00:00Z",
        endsAt: "2026-11-15T09:00:00Z",
        overnight: true,
        guestCount: 1,
      },
      existingEvents,
      2, // Limit is 2
    );

    expect(result.hasWarning).toBe(true);
    expect(result.warnings[0]).toContain("This is overnight guest #3 this week");
  });

  it("allows non-overnight guests without counting toward overnight limit", () => {
    const result = checkCalendarConflicts(
      {
        kind: "guest",
        title: "Quick dinner",
        startsAt: "2026-11-14T18:00:00Z",
        endsAt: "2026-11-14T20:00:00Z",
        overnight: false,
        guestCount: 1,
      },
      existingEvents,
      2,
    );

    expect(result.hasWarning).toBe(false);
  });
});
