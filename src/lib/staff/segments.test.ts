import { describe, expect, it } from "vitest";
import {
  barValue,
  compareSet,
  displayCount,
  displayValue,
  segmentLabel,
  type SegmentRow,
} from "./segments";

const row = (r: Partial<SegmentRow>): SegmentRow => ({
  value: "x",
  n: 40,
  numerator: 10,
  rate: 0.25,
  average: null,
  suppressed: false,
  ...r,
});

describe("segment analytics", () => {
  it("formats rates, scores and averages, and reads small counts as <5", () => {
    expect(displayValue(row({}), "matched")).toBe("25%");
    expect(
      displayValue(row({ n: null, numerator: null, rate: null, suppressed: true }), "matched"),
    ).toBe("<5");
    expect(displayValue(row({ numerator: null, rate: null, suppressed: true }), "matched")).toBe(
      "<5",
    );
    expect(displayValue(row({ average: 81.5, rate: null }), "best_score")).toBe("82");
    expect(displayValue(row({ average: 3.456, rate: null }), "checkin_avg")).toBe("3.5");
    expect(displayCount(null)).toBe("<5");
    expect(displayCount(1234)).toBe("1,234");
  });

  it("hides the bar for suppressed rows and scales the rest to 0–1", () => {
    expect(barValue(row({ suppressed: true }), "matched")).toBeNull();
    expect(barValue(row({}), "matched")).toBe(0.25);
    expect(barValue(row({ average: 80, rate: null }), "best_score")).toBe(0.8);
    expect(barValue(row({ average: 4, rate: null }), "checkin_avg")).toBe(0.8);
  });

  it("labels values from fixed lists or the school's options, never guessing", () => {
    expect(segmentLabel("track", "freshman")).toBe("First-year");
    expect(segmentLabel("academic_college", "eng", { eng: "Engineering" })).toBe("Engineering");
    expect(segmentLabel("llc", "unknown")).toBe("No LLC");
    expect(segmentLabel("campus", "unknown")).toBe("Not given");
  });

  it("compares at most three known segments", () => {
    expect(compareSet("a,z,b,c,d", ["a", "b", "c", "d"])).toEqual(["a", "b", "c"]);
    expect(compareSet(undefined, ["a"])).toEqual([]);
  });
});

describe("complementary suppression", () => {
  it("labels a segment hidden to protect a small one as hidden, not as under 5", async () => {
    const { displayCount, displayValue, barValue } = await import("./segments");
    const hidden = {
      value: "senior",
      n: null,
      numerator: null,
      rate: null,
      average: null,
      suppressed: true,
      complementary: true,
    };
    expect(displayValue(hidden, "matched")).toBe("Hidden");
    expect(displayCount(hidden.n, hidden.complementary)).toBe("Hidden");
    expect(barValue(hidden, "matched")).toBeNull();
    expect(displayCount(null)).toBe("<5");
  });
});
