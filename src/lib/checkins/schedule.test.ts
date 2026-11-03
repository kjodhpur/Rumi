import { describe, expect, it } from "vitest";
import { checkinDueDates } from "./schedule";

describe("check-in schedule", () => {
  it("defaults to weeks 2, 4 and 8, then monthly until the term ends", () => {
    expect(checkinDueDates("2026-08-15", { until: "2026-12-15" })).toEqual(["2026-08-29", "2026-09-12", "2026-10-10", "2026-11-10", "2026-12-10"]);
  });

  it("follows a school's own offsets and can skip the monthly tail", () => {
    expect(checkinDueDates("2026-08-15", { offsets: [7, 21], monthlyAfter: false, until: "2026-12-15" })).toEqual(["2026-08-22", "2026-09-05"]);
  });

  it("never schedules past the end date and clamps month ends", () => {
    expect(checkinDueDates("2026-12-03", { offsets: [28], until: "2027-03-31" })).toEqual(["2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(checkinDueDates("2026-12-01", { until: "2026-12-10" })).toEqual([]);
  });
});
