import { describe, expect, it } from "vitest";
import { suggestSlots } from "./free-slots";

const TZ = "America/Phoenix";
// Monday 2026-11-09 08:00 in Phoenix (15:00Z).
const now = Date.parse("2026-11-09T15:00:00Z");
const phx = (date: string, time: string) => Date.parse(`${date}T${time}:00-07:00`);
const label = (ms: number) =>
  new Date(ms).toLocaleString("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

describe("suggestSlots", () => {
  it("starts two hours out, inside waking hours, one per day", () => {
    const slots = suggestSlots([], [], { now, timeZone: TZ });
    expect(slots.map((s) => label(s.start))).toEqual([
      "Mon 10:00 AM",
      "Tue 9:00 AM",
      "Wed 9:00 AM",
    ]);
    for (const s of slots) expect(s.end - s.start).toBe(3_600_000);
  });

  it("avoids everyone's busy times and class blocks", () => {
    const busy = [
      { start: phx("2026-11-09", "10:00"), end: phx("2026-11-09", "12:00") },
      { start: phx("2026-11-10", "08:00"), end: phx("2026-11-10", "13:00") },
    ];
    const classes = [{ day: 0, start: "12:00", end: "13:15" }]; // Mondays
    const slots = suggestSlots(busy, classes, { now, timeZone: TZ });
    expect(slots.map((s) => label(s.start))).toEqual(["Mon 1:30 PM", "Tue 1:00 PM", "Wed 9:00 AM"]);
  });

  it("fills from the same days when the week is packed, 2 hours apart", () => {
    const busy = [{ start: phx("2026-11-10", "00:00"), end: phx("2026-11-17", "00:00") }];
    const slots = suggestSlots(busy, [], { now, timeZone: TZ });
    expect(slots.map((s) => label(s.start))).toEqual([
      "Mon 10:00 AM",
      "Mon 12:00 PM",
      "Mon 2:00 PM",
    ]);
  });

  it("returns nothing when no hour works", () => {
    const busy = [{ start: now, end: now + 8 * 86_400_000 }];
    expect(suggestSlots(busy, [], { now, timeZone: TZ })).toEqual([]);
  });
});
