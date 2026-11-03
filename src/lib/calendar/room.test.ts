import { describe, expect, it } from "vitest";
import {
  agreementOvernightLimit,
  buildWeeklyRule,
  campusLocalToIso,
  campusWeekKey,
  guestLimitWarning,
  isoToCampusLocal,
  occurrences,
  parseWeeklyRule,
  quietOverlaps,
  type RoomEvent,
} from "./room";
import { escapeIcsText, formatIcsDate, generateIcsFeed, singleEventIcs } from "./ics";

const TZ = "America/Phoenix";
const ev = (id: string, over: Partial<RoomEvent> = {}): RoomEvent => ({
  id,
  kind: "guest",
  title: id,
  startsAt: "2026-11-02T03:00:00.000Z", // Sun Nov 1, 8pm Phoenix
  endsAt: "2026-11-02T15:00:00.000Z",
  overnight: true,
  guestCount: 1,
  rrule: null,
  ...over,
});

describe("weekly rules", () => {
  it("builds and parses BYDAY + UNTIL", () => {
    const rule = buildWeeklyRule(["WE", "MO"], "2026-12-15T00:00:00.000Z");
    expect(rule).toBe("FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261215T000000Z");
    expect(parseWeeklyRule(rule)).toEqual({ days: ["MO", "WE"], until: new Date("2026-12-15T00:00:00Z") });
    expect(parseWeeklyRule("FREQ=DAILY")).toBeNull();
  });

  it("expands quiet hours on each listed weekday until UNTIL", () => {
    // Mon Nov 2 2026, 05:00–13:00 UTC (10pm–6am Phoenix)
    const quiet = ev("q", { kind: "quiet", overnight: false, guestCount: 0, startsAt: "2026-11-02T05:00:00.000Z", endsAt: "2026-11-02T13:00:00.000Z", rrule: "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261111T000000Z" });
    const list = occurrences(quiet, new Date("2026-11-01T00:00:00Z"), new Date("2026-11-30T00:00:00Z"));
    expect(list.map((o) => o.startsAt)).toEqual(["2026-11-02T05:00:00.000Z", "2026-11-04T05:00:00.000Z", "2026-11-09T05:00:00.000Z"]);
  });

  it("never returns occurrences before the first one", () => {
    const quiet = ev("q", { kind: "quiet", startsAt: "2026-11-04T05:00:00.000Z", endsAt: "2026-11-04T06:00:00.000Z", rrule: "FREQ=WEEKLY;BYDAY=MO,WE" });
    const list = occurrences(quiet, new Date("2026-11-01T00:00:00Z"), new Date("2026-11-08T00:00:00Z"));
    expect(list.map((o) => o.startsAt)).toEqual(["2026-11-04T05:00:00.000Z"]);
  });
});

describe("guest limit", () => {
  it("reads the agreement's overnight limit", () => {
    expect(agreementOvernightLimit("We text a heads-up. Overnight guests at most 2 nights a week, and never during exams.")).toBe(2);
    expect(agreementOvernightLimit("No overnight guests without asking first each time.")).toBe(0);
    expect(agreementOvernightLimit("Overnight guests at most one night a week.")).toBe(1);
    expect(agreementOvernightLimit("Guests are fine.")).toBeNull();
    expect(agreementOvernightLimit(null)).toBeNull();
  });

  it("counts overnights in the campus Monday–Sunday week", () => {
    expect(campusWeekKey("2026-11-02T03:00:00.000Z", TZ)).toBe("2026-10-26"); // Sunday night in Phoenix
    expect(campusWeekKey("2026-11-03T03:00:00.000Z", TZ)).toBe("2026-11-02");
  });

  it("warns on the overnight past the limit, matching the brief's wording", () => {
    const week = [ev("a", { startsAt: "2026-11-03T04:00:00.000Z" }), ev("b", { startsAt: "2026-11-04T04:00:00.000Z" }), ev("c", { startsAt: "2026-11-05T04:00:00.000Z" })];
    const next = ev("d", { startsAt: "2026-11-06T04:00:00.000Z" });
    expect(guestLimitWarning(next, week, 2, TZ)).toBe("This would be the 4th overnight this week; your agreement says 2.");
    expect(guestLimitWarning(next, week.slice(0, 1), 2, TZ)).toBeNull();
    expect(guestLimitWarning({ ...next, overnight: false }, week, 2, TZ)).toBeNull();
    expect(guestLimitWarning(next, week, null, TZ)).toBeNull();
  });
});

describe("quiet hours", () => {
  it("flags a guest event that runs into recurring quiet hours", () => {
    const quiet = ev("q", { kind: "quiet", title: "Weeknight quiet", overnight: false, guestCount: 0, startsAt: "2026-11-03T05:00:00.000Z", endsAt: "2026-11-03T13:00:00.000Z", rrule: "FREQ=WEEKLY;BYDAY=TU,WE,TH" });
    expect(quietOverlaps({ kind: "guest", startsAt: "2026-11-11T04:00:00.000Z", endsAt: "2026-11-11T07:00:00.000Z" }, [quiet])).toEqual(["Weeknight quiet"]);
    expect(quietOverlaps({ kind: "guest", startsAt: "2026-11-08T04:00:00.000Z", endsAt: "2026-11-08T07:00:00.000Z" }, [quiet])).toEqual([]);
    expect(quietOverlaps({ kind: "away", startsAt: "2026-11-11T04:00:00.000Z", endsAt: "2026-11-11T07:00:00.000Z" }, [quiet])).toEqual([]);
  });
});

describe("campus time", () => {
  it("round-trips wall-clock times in the campus zone", () => {
    expect(campusLocalToIso("2026-11-03T22:00", TZ)).toBe("2026-11-04T05:00:00.000Z");
    expect(isoToCampusLocal("2026-11-04T05:00:00.000Z", TZ)).toBe("2026-11-03T22:00");
    expect(campusLocalToIso("2026-07-01T09:30", "America/New_York")).toBe("2026-07-01T13:30:00.000Z");
    expect(campusLocalToIso("not a date", TZ)).toBeNull();
  });
});

describe("ics", () => {
  it("formats and escapes per RFC 5545", () => {
    expect(formatIcsDate(new Date("2026-11-10T14:30:00.000Z"))).toBe("20261110T143000Z");
    expect(escapeIcsText("Hello, world; welcome\nagain")).toBe("Hello\\, world\\; welcome\\nagain");
  });

  it("writes events with RRULE, CRLF line endings and folded long lines", () => {
    const ics = generateIcsFeed("Room 302", [
      { ...ev("e1", { kind: "quiet", title: "Exam week quiet hours, please keep it down in the evenings and on weekends too", rrule: "FREQ=WEEKLY;BYDAY=MO" }), notes: "Thanks", createdByName: "Ana" },
    ], new Date("2026-11-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(ics).toContain("UID:e1@rumimatch.app");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("makes an all-day deadline file", () => {
    const ics = singleEventIcs({ uid: "deadline-1", title: "Roommate request deadline", date: "2027-03-01" }, new Date("2026-11-01T00:00:00Z"));
    expect(ics).toContain("DTSTART;VALUE=DATE:20270301");
    expect(ics).toContain("DTEND;VALUE=DATE:20270302");
  });
});
