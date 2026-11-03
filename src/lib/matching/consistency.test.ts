import { describe, expect, it } from "vitest";
import { checkAnswerConsistency, type ConsistencyInput } from "./consistency";

describe("checkAnswerConsistency", () => {
  it("flags sleep and noise contradiction", () => {
    const input: ConsistencyInput = {
      sleepSchedule: 1, // early
      noise: 5, // high late noise
    };
    const flags = checkAnswerConsistency(input);
    expect(flags.some((f) => f.ruleKey === "sleep_noise_divergence")).toBe(true);
  });

  it("does not flag aligned sleep and noise", () => {
    const input: ConsistencyInput = {
      sleepSchedule: 1, // early
      noise: 1, // quiet
    };
    const flags = checkAnswerConsistency(input);
    expect(flags.some((f) => f.ruleKey === "sleep_noise_divergence")).toBe(false);
  });

  it("flags frequent guests alongside quiet study requirement", () => {
    const input: ConsistencyInput = {
      guests: 5,
      study: "quiet",
    };
    const flags = checkAnswerConsistency(input);
    expect(flags.some((f) => f.ruleKey === "guest_study_friction")).toBe(true);
  });

  it("flags when all weights are set to Must (3)", () => {
    const weights: Record<string, number> = {
      sleep: 3,
      cleanliness: 3,
      noise: 3,
      guests: 3,
      smoking: 3,
      drinking: 3,
      pets: 3,
      study: 3,
    };
    const flags = checkAnswerConsistency({ weights });
    expect(flags.some((f) => f.ruleKey === "all_must_weights")).toBe(true);
  });

  it("does not flag realistic diversified weights", () => {
    const weights: Record<string, number> = {
      sleep: 3,
      cleanliness: 2,
      noise: 1,
      guests: 0,
      smoking: 3,
      drinking: 1,
      pets: 0,
      study: 2,
    };
    const flags = checkAnswerConsistency({ weights });
    expect(flags.some((f) => f.ruleKey === "all_must_weights")).toBe(false);
  });

  it("returns empty array for harmonious answers", () => {
    const input: ConsistencyInput = {
      sleepSchedule: 3,
      cleanliness: 3,
      noise: 3,
      guests: 3,
      study: "moderate",
    };
    expect(checkAnswerConsistency(input)).toEqual([]);
  });
});
