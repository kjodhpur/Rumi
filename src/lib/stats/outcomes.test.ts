import { describe, expect, it } from "vitest";
import {
  armMetrics,
  compareProportions,
  deidentifiedCsv,
  formatProportion,
  proportion,
  scoreBand,
  type OutcomeStudent,
} from "./outcomes";
import { wilson } from "./wilson";

const s = (over: Partial<OutcomeStudent>): OutcomeStudent => ({
  arm: "rumi",
  assigned: true,
  movedInAt: "2026-08-15",
  firstChangeAt: null,
  checkinScores: [],
  inGroup: false,
  agreementSigned: false,
  roomAgain: null,
  retained: null,
  ...over,
});

describe("Wilson interval", () => {
  it("matches a known value", () => {
    // 8 of 10: Wilson 95% ≈ [0.490, 0.943]
    const ci = wilson(8, 10)!;
    expect(ci.low).toBeCloseTo(0.4902, 3);
    expect(ci.high).toBeCloseTo(0.9433, 3);
    expect(wilson(0, 0)).toBeNull();
  });
});

describe("suppression", () => {
  it("hides any cell with 1–4 students, numerator or denominator", () => {
    expect(proportion(3, 40).suppressed).toBe(true);
    expect(proportion(0, 40).suppressed).toBe(false);
    expect(proportion(4, 4).suppressed).toBe(true);
    expect(formatProportion(proportion(3, 40))).toBe("<5");
    expect(formatProportion(proportion(10, 40))).toBe("25%");
    expect(formatProportion(proportion(0, 0))).toBe("—");
  });
});

describe("arm metrics", () => {
  it("counts room changes over assigned students and the median days to the first one", () => {
    const students = [
      ...Array.from({ length: 5 }, (_, i) =>
        s({ firstChangeAt: `2026-09-${String(10 + i).padStart(2, "0")}T12:00:00Z` }),
      ),
      ...Array.from({ length: 15 }, () => s({})),
      s({ arm: "control", firstChangeAt: "2026-09-01T00:00:00Z" }),
      s({ assigned: false }),
    ];
    const m = armMetrics("rumi", students);
    expect(m.students).toBe(21);
    expect(m.roomChange).toMatchObject({ k: 5, n: 20, rate: 0.25, suppressed: false });
    expect(m.medianDaysToFirstChange).toBe(29); // Sep 12 noon is 28.5 days after Aug 15
  });

  it("averages consented check-ins per student and suppresses under five", () => {
    const few = armMetrics("rumi", [s({ checkinScores: [4, 2] }), s({ checkinScores: [5] })]);
    expect(few.checkinAverage).toEqual({ value: null, n: 2, suppressed: true });
    const many = armMetrics(
      "rumi",
      Array.from({ length: 5 }, () => s({ checkinScores: [4, 2] })),
    );
    expect(many.checkinAverage.value).toBe(3);
  });
});

describe("comparison", () => {
  it("labels a real difference as significant", () => {
    const c = compareProportions(proportion(5, 100), proportion(25, 100));
    expect(c.significant).toBe(true);
    expect(c.p).toBeLessThan(0.001);
  });

  it("says 'not statistically significant' when it isn't", () => {
    expect(compareProportions(proportion(10, 50), proportion(12, 50))).toMatchObject({
      significant: false,
      label: "Not statistically significant",
    });
  });

  it("refuses to compare tiny arms", () => {
    expect(compareProportions(proportion(1, 4), proportion(10, 40)).label).toBe(
      "Not enough students to compare",
    );
  });

  it("gives no p-value when either arm has a suppressed 1–4 count", () => {
    expect(compareProportions(proportion(9, 170), proportion(2, 20))).toMatchObject({
      p: null,
      significant: false,
    });
    expect(compareProportions(proportion(9, 170), proportion(18, 20)).p).toBeNull();
    expect(compareProportions(proportion(9, 170), proportion(0, 20)).p).not.toBeNull();
  });
});

describe("de-identified export", () => {
  it("has no identifiers and a stable, sorted order", () => {
    const csv = deidentifiedCsv([
      {
        arm: "rumi",
        scoreBand: scoreBand(91),
        agreementSigned: "Y",
        checkinAverage: "4.5",
        roomChange: "N",
        roomAgain: "yes",
      },
      {
        arm: "control",
        scoreBand: scoreBand(null),
        agreementSigned: "",
        checkinAverage: "",
        roomChange: "Y",
        roomAgain: "",
      },
    ]);
    expect(csv.split("\r\n")[0]).toBe(
      "arm,score_band,agreement_signed,checkin_average,room_change,room_again",
    );
    expect(csv).toContain("control,unknown,,,Y,");
    expect(csv).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}|20\d\d-\d\d/);
  });
});
