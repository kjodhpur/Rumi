import { describe, expect, it } from "vitest";
import { count, days, isSuppressed, segmentTable, share } from "./metrics";

describe("small-number suppression", () => {
  it("hides counts of 1–4 but shows 0 and 5+", () => {
    expect([0, 1, 4, 5, 1234].map(count)).toEqual(["0", "<5", "<5", "5", "1,234"]);
    expect(isSuppressed(0)).toBe(false);
  });

  it("never computes a rate over fewer than 5 students", () => {
    expect(share(2, 3)).toBe("—");
    expect(share(0, 4)).toBe("—");
  });

  it("doesn't reveal a tiny numerator as a percentage", () => {
    expect(share(3, 200)).toBe("<5");
    expect(share(0, 200)).toBe("0%");
    expect(share(50, 200)).toBe("25%");
  });
});

describe("days", () => {
  it("rounds and pluralizes", () => {
    expect(days(null)).toBe("—");
    expect(days(0.2)).toBe("<1 day");
    expect(days(1.2)).toBe("1 day");
    expect(days(7.6)).toBe("8 days");
  });
});

describe("segmentTable", () => {
  it("pivots segments into one row per value with a total", () => {
    const rows = segmentTable(
      [
        { dimension: "class_year", value: "junior", bin: "80-89", n: 6 },
        { dimension: "class_year", value: "junior", bin: "none", n: 2 },
        { dimension: "housing_type", value: "on_campus", bin: "80-89", n: 9 },
      ],
      "class_year",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells["80-89"]).toBe(6);
    expect(rows[0].total).toBe(8);
  });
});
