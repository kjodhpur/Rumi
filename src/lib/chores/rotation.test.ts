import { describe, expect, it } from "vitest";
import {
  calculateNextDueDate,
  getNextAssignee,
} from "./rotation";

describe("chore rotation scheduler", () => {
  it("cycles assignees in order and loops back to beginning", () => {
    const rotation = ["user-1", "user-2", "user-3"];

    expect(getNextAssignee(rotation, null)).toBe("user-1");
    expect(getNextAssignee(rotation, "user-1")).toBe("user-2");
    expect(getNextAssignee(rotation, "user-2")).toBe("user-3");
    expect(getNextAssignee(rotation, "user-3")).toBe("user-1"); // wraps around
  });

  it("handles empty or missing rotation gracefully", () => {
    expect(getNextAssignee([], "user-1")).toBeNull();
  });

  it("calculates correct future due dates", () => {
    const base = new Date("2026-11-03T12:00:00Z");
    expect(calculateNextDueDate(base, "daily")).toBe("2026-11-04");
    expect(calculateNextDueDate(base, "weekly")).toBe("2026-11-10");
    expect(calculateNextDueDate(base, "biweekly")).toBe("2026-11-17");
  });
});
