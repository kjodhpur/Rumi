import { describe, expect, it } from "vitest";
import {
  calculateDaysUntil,
  evaluateNudgeEligibility,
  formatNudgeCopy,
  type DeadlineKey,
} from "./deadline-nudges";

describe("Phase 1.H Deadline-Aware Nudges", () => {
  it("calculates exact calendar days remaining until deadline with fixed clock", () => {
    const fixedNow = "2026-08-01T10:00:00Z";

    expect(calculateDaysUntil("2026-08-08T23:59:59Z", fixedNow)).toBe(7);
    expect(calculateDaysUntil("2026-08-03T23:59:59Z", fixedNow)).toBe(2);
    expect(calculateDaysUntil("2026-08-01T23:59:59Z", fixedNow)).toBe(0);
    expect(calculateDaysUntil("2026-07-30T10:00:00Z", fixedNow)).toBe(-2);
  });

  it("evaluates nudge eligibility according to rule offsets and pause state", () => {
    const rule = {
      deadlineKey: "roommate_deadline" as DeadlineKey,
      offsets: [7, 2, 0],
      paused: false,
    };

    // T-7 fires
    expect(evaluateNudgeEligibility(rule, 7)).toEqual({
      shouldSend: true,
      offsetDays: 7,
    });

    // T-2 fires
    expect(evaluateNudgeEligibility(rule, 2)).toEqual({
      shouldSend: true,
      offsetDays: 2,
    });

    // T-0 fires
    expect(evaluateNudgeEligibility(rule, 0)).toEqual({
      shouldSend: true,
      offsetDays: 0,
    });

    // Non-offset day (e.g. 5 days remaining) does NOT fire
    expect(evaluateNudgeEligibility(rule, 5)).toEqual({
      shouldSend: false,
      offsetDays: null,
    });

    // Paused rule NEVER fires even on offset days
    const pausedRule = { ...rule, paused: true };
    expect(evaluateNudgeEligibility(pausedRule, 7)).toEqual({
      shouldSend: false,
      offsetDays: null,
    });
  });

  it("generates actionable copy and destination deep links", () => {
    const roommateT7 = formatNudgeCopy("roommate_deadline", 7);
    expect(roommateT7.title).toContain("7 days");
    expect(roommateT7.link).toBe("/matches");

    const roommateT0 = formatNudgeCopy("roommate_deadline", 0);
    expect(roommateT0.title).toContain("Today");
    expect(roommateT0.link).toBe("/matches");

    const agreementT2 = formatNudgeCopy("agreement_due", 2);
    expect(agreementT2.title).toContain("2 days");
    expect(agreementT2.link).toBe("/groups");

    const selectionT0 = formatNudgeCopy("selection_window", 0);
    expect(selectionT0.title).toContain("Room selection opens today!");
    expect(selectionT0.link).toBe("/groups");
  });
});
