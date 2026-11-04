import { describe, expect, it } from "vitest";
import { classBlocksSchema, normalizeBlocks, parseClassIcs, summarizeBlocks } from "./class-schedule";

const TZ = "America/Phoenix";

const ics = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");

describe("parseClassIcs", () => {
  it("reads weekly classes with BYDAY in the campus zone", () => {
    const text = ics(
      [
        "BEGIN:VEVENT",
        "SUMMARY:CSE 110",
        "DTSTART;TZID=America/Phoenix:20260819T090000",
        "DTEND;TZID=America/Phoenix:20260819T101500",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261204T000000Z",
        "END:VEVENT",
      ].join("\r\n"),
    );
    expect(parseClassIcs(text, TZ)).toEqual([
      { day: 0, start: "09:00", end: "10:15" },
      { day: 2, start: "09:00", end: "10:15" },
    ]);
  });

  it("converts UTC and other zones to campus time", () => {
    const text = ics(
      // 16:30Z is 09:30 in Phoenix (UTC−7 all year).
      "BEGIN:VEVENT\r\nDTSTART:20260818T163000Z\r\nDTEND:20260818T174500Z\r\nRRULE:FREQ=WEEKLY;BYDAY=TU\r\nEND:VEVENT",
      // 1pm Chicago (CDT, UTC−5) is 11am Phoenix.
      "BEGIN:VEVENT\r\nDTSTART;TZID=America/Chicago:20260820T130000\r\nDURATION:PT50M\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT",
    );
    expect(parseClassIcs(text, TZ)).toEqual([
      { day: 1, start: "09:30", end: "10:45" },
      { day: 3, start: "11:00", end: "11:50" },
    ]);
  });

  it("shifts BYDAY when the time zone moves the class to another day", () => {
    // Monday 05:00Z is Sunday 22:00 in Phoenix.
    const text = ics(
      "BEGIN:VEVENT\r\nDTSTART:20260817T050000Z\r\nDTEND:20260817T060000Z\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEND:VEVENT",
    );
    expect(parseClassIcs(text, TZ)).toEqual([{ day: 6, start: "22:00", end: "23:00" }]);
  });

  it("drops Canvas due dates, all-day items, one-offs and cancelled events", () => {
    const text = ics(
      // An assignment due at 11:59pm: zero length.
      "BEGIN:VEVENT\r\nSUMMARY:HW 1 due\r\nDTSTART:20260905T065900Z\r\nDTEND:20260905T065900Z\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nSUMMARY:Labor Day\r\nDTSTART;VALUE=DATE:20260907\r\nDTEND;VALUE=DATE:20260908\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nSUMMARY:Office hours once\r\nDTSTART;TZID=America/Phoenix:20260910T140000\r\nDTEND;TZID=America/Phoenix:20260910T150000\r\nEND:VEVENT",
      "BEGIN:VEVENT\r\nSTATUS:CANCELLED\r\nDTSTART;TZID=America/Phoenix:20260819T120000\r\nDTEND;TZID=America/Phoenix:20260819T130000\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT",
    );
    expect(parseClassIcs(text, TZ)).toEqual([]);
  });

  it("keeps repeated single events (Canvas lists each meeting separately)", () => {
    const meeting = (date: string) =>
      `BEGIN:VEVENT\r\nDTSTART;TZID=America/Phoenix:${date}T150000\r\nDTEND;TZID=America/Phoenix:${date}T161500\r\nEND:VEVENT`;
    const text = ics(meeting("20260820"), meeting("20260827"), meeting("20260903"));
    expect(parseClassIcs(text, TZ)).toEqual([{ day: 3, start: "15:00", end: "16:15" }]);
  });

  it("handles folded lines", () => {
    const text = ics(
      "BEGIN:VEVENT\r\nSUMMARY:A very long course title that wraps\r\n  onto the next line\r\nDTSTART;TZID=America/Phoenix:20260819T080000\r\nDTEND;TZID=America/Phoenix:20260819T085000\r\nRRULE:FREQ=WEEKLY;BY\r\n DAY=FR\r\nEND:VEVENT",
    );
    expect(parseClassIcs(text, TZ)).toEqual([{ day: 4, start: "08:00", end: "08:50" }]);
  });
});

describe("blocks", () => {
  it("validates manual entries", () => {
    expect(classBlocksSchema.safeParse([{ day: 0, start: "09:00", end: "10:15" }]).success).toBe(true);
    expect(classBlocksSchema.safeParse([{ day: 0, start: "10:00", end: "09:00" }]).success).toBe(false);
    expect(classBlocksSchema.safeParse([{ day: 7, start: "09:00", end: "10:00" }]).success).toBe(false);
    expect(classBlocksSchema.safeParse([{ day: 0, start: "9:00", end: "10:00" }]).success).toBe(false);
  });

  it("dedupes, sorts and summarizes", () => {
    const blocks = normalizeBlocks([
      { day: 2, start: "09:00", end: "10:15" },
      { day: 0, start: "09:00", end: "10:15" },
      { day: 0, start: "09:00", end: "10:15" },
      { day: 1, start: "13:30", end: "14:45" },
    ]);
    expect(blocks).toHaveLength(3);
    expect(summarizeBlocks(blocks)).toEqual(["Mon, Wed 9:00–10:15", "Tue 13:30–14:45"]);
  });
});
