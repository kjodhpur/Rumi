import { describe, expect, it } from "vitest";
import { monthlyTotals, parseRoomChangeStats, scoreBand, validTags } from "./room-changes";

describe("room-change analytics", () => {
  it("bands scores at 50, 70 and 85", () => {
    expect([null, 0, 49, 50, 69, 70, 84, 85, 100].map(scoreBand)).toEqual([
      "unknown",
      "<50",
      "<50",
      "50-69",
      "50-69",
      "70-84",
      "70-84",
      "85+",
      "85+",
    ]);
  });

  it("parses the SQL payload defensively", () => {
    const s = parseRoomChangeStats({
      total: 12,
      untagged: null,
      byReason: [{ key: "noise", n: 7 }],
      byBand: [{ band: "<50", requests: 6, assigned: 20, rate: 0.3 }, { band: "weird" }],
      byAgreement: [{ signed: "true", n: 5 }],
    });
    expect(s.total).toBe(12);
    expect(s.untagged).toBeNull();
    expect(s.byBand[1].band).toBe("unknown");
    expect(s.byMonth).toEqual([]);
    expect(parseRoomChangeStats(null).byReason).toEqual([]);
  });

  it("sums months across reasons and keeps suppression", () => {
    expect(
      monthlyTotals([
        { month: "2026-10", key: "noise", n: 6 },
        { month: "2026-10", key: "guests", n: 5 },
        { month: "2026-09", key: "noise", n: null },
      ]),
    ).toEqual([
      { month: "2026-09", n: null },
      { month: "2026-10", n: 11 },
    ]);
  });

  it("accepts 1–3 distinct active tags", () => {
    expect(validTags(["noise"], ["noise", "guests"])).toBe(true);
    expect(validTags([], ["noise"])).toBe(false);
    expect(validTags(["noise", "noise"], ["noise"])).toBe(false);
    expect(validTags(["a", "b", "c", "d"], ["a", "b", "c", "d"])).toBe(false);
    expect(validTags(["retired"], ["noise"])).toBe(false);
  });
});
