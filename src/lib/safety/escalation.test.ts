import { describe, expect, it } from "vitest";
import {
  ESCALATION_CATEGORIES,
  isEscalationCategory,
  NATIONAL_EMERGENCY_RESOURCES,
  resolveEscalationDestination,
  type EscalationRoute,
} from "./escalation";

describe("escalation routing", () => {
  const dummyRoutes: EscalationRoute[] = [
    {
      id: "1",
      schoolId: "asu",
      category: "harassment",
      destinationLabel: "ASU Title IX Office",
      url: "https://sexualviolenceprevention.asu.edu",
      phone: "480-965-0696",
      email: "titleix@asu.edu",
      active: true,
      createdAt: "2026-11-03T00:00:00Z",
      updatedAt: "2026-11-03T00:00:00Z",
    },
    {
      id: "2",
      schoolId: "asu",
      category: "threat",
      destinationLabel: "ASU Police",
      url: "https://cfo.asu.edu/police",
      phone: "480-965-3456",
      email: null,
      active: false, // inactive route
      createdAt: "2026-11-03T00:00:00Z",
      updatedAt: "2026-11-03T00:00:00Z",
    },
  ];

  it("resolves active route for matching category", () => {
    const route = resolveEscalationDestination("harassment", dummyRoutes);
    expect(route).not.toBeNull();
    expect(route?.destinationLabel).toBe("ASU Title IX Office");
  });

  it("returns null when matching route is inactive", () => {
    const route = resolveEscalationDestination("threat", dummyRoutes);
    expect(route).toBeNull();
  });

  it("returns null when no route exists for the category", () => {
    const route = resolveEscalationDestination("discrimination", dummyRoutes);
    expect(route).toBeNull();
  });

  it("validates categories correctly", () => {
    expect(isEscalationCategory("harassment")).toBe(true);
    expect(isEscalationCategory("threat")).toBe(true);
    expect(isEscalationCategory("wellbeing")).toBe(true);
    expect(isEscalationCategory("invalid_category")).toBe(false);
  });

  it("includes 911 and 988 in national resources", () => {
    const phones = NATIONAL_EMERGENCY_RESOURCES.map((r) => r.phone);
    expect(phones).toContain("911");
    expect(phones).toContain("988");
  });

  it("has exactly 5 official categories", () => {
    expect(ESCALATION_CATEGORIES.length).toBe(5);
  });
});
