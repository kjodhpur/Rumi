import { describe, expect, it } from "vitest";
import { intervalsDiffer, suppressCount, wilson } from "./wilson";

describe("wilson", () => {
  it("centers a coin flip and stays inside 0 and 1", () => {
    const interval = wilson(50, 100);
    expect(interval).not.toBeNull();
    expect(interval!.low).toBeCloseTo(0.4038, 3);
    expect(interval!.high).toBeCloseTo(0.5962, 3);
  });

  it("is wider for a small sample and empty for no trials", () => {
    const small = wilson(1, 2)!;
    const large = wilson(50, 100)!;
    expect(small.high - small.low).toBeGreaterThan(large.high - large.low);
    expect(wilson(0, 0)).toBeNull();
    expect(wilson(3, 2)).toBeNull();
  });

  it("covers a known 10 of 20 case", () => {
    const interval = wilson(10, 20)!;
    expect(interval.low).toBeCloseTo(0.2993, 3);
    expect(interval.high).toBeCloseTo(0.7007, 3);
  });
});

describe("suppression and comparison", () => {
  it("hides 1 to 4 and keeps zero", () => {
    expect(suppressCount(0)).toBe(0);
    expect(suppressCount(4)).toBe("<5");
    expect(suppressCount(5)).toBe(5);
  });

  it("calls a difference only when the intervals do not overlap", () => {
    expect(intervalsDiffer(wilson(80, 100), wilson(20, 100))).toBe(true);
    expect(intervalsDiffer(wilson(50, 100), wilson(55, 100))).toBe(false);
    expect(intervalsDiffer(wilson(1, 2), wilson(0, 2))).toBe(false);
  });
});
