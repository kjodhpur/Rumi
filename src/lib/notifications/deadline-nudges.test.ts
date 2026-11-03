import { describe, expect, it } from "vitest";
import { daysUntil, dueOffset, effectiveRules, needsNudge, nudgeCopy, schedulePreview } from "./deadline-nudges";

describe("deadline nudges", () => {
  it("fires at T-7, T-2 and T-0 by campus date (fixed clock)", () => {
    expect(daysUntil("2027-03-01", "2027-02-22")).toBe(7);
    expect(dueOffset([7, 2, 0], "2027-03-01", "2027-02-22")).toBe(7);
    expect(dueOffset([7, 2, 0], "2027-03-01", "2027-02-27")).toBe(2);
    expect(dueOffset([7, 2, 0], "2027-03-01", "2027-03-01")).toBe(0);
    expect(dueOffset([7, 2, 0], "2027-03-01", "2027-02-25")).toBeNull();
    expect(dueOffset([7, 2, 0], "2027-03-01", "2027-03-02")).toBeNull();
  });

  it("nudges only students the deadline is about", () => {
    expect(needsNudge("roommateRequest", { confirmed: false, agreementSigned: false })).toBe(true);
    expect(needsNudge("roommateRequest", { confirmed: true, agreementSigned: false })).toBe(false);
    expect(needsNudge("agreementDue", { confirmed: true, agreementSigned: false })).toBe(true);
    expect(needsNudge("agreementDue", { confirmed: true, agreementSigned: true })).toBe(false);
    expect(needsNudge("agreementDue", { confirmed: false, agreementSigned: false })).toBe(false);
  });

  it("names the deadline and links the next step", () => {
    expect(nudgeCopy("roommateRequest", 2, "ASU Housing")).toMatchObject({ title: "ASU Housing's roommate request deadline is in 2 days", href: "/matches" });
    expect(nudgeCopy("agreementDue", 0, "x").title).toBe("Your roommate agreement is due today");
  });

  it("uses defaults for deadlines without a saved rule, and keeps paused rules paused", () => {
    const rules = effectiveRules([{ id: "r1", deadlineKey: "agreementDue", offsets: [3], channels: ["in_app"], paused: true }], { roommateRequest: "2027-03-01", agreementDue: "2027-09-01" });
    expect(rules.map((r) => [r.deadlineKey, r.offsets, r.paused])).toEqual([["roommateRequest", [7, 2, 0], false], ["agreementDue", [3], true]]);
  });

  it("previews the schedule in date order", () => {
    const rules = effectiveRules([], { roommateRequest: "2027-03-01" });
    expect(schedulePreview(rules, { roommateRequest: "2027-03-01" }, "2027-02-25").map((s) => [s.date, s.offset, s.past])).toEqual([
      ["2027-02-22", 7, true],
      ["2027-02-27", 2, false],
      ["2027-03-01", 0, false],
    ]);
  });
});
