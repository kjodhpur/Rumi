import { describe, expect, it } from "vitest";
import { CAN, parseScopes, roleCan, STAFF_ROLES } from "./roles";
import { hashToken, inviteExpiry, newInviteToken } from "./tokens";

describe("roleCan", () => {
  it("lets platform admins do everything", () => {
    for (const capability of Object.keys(CAN) as (keyof typeof CAN)[]) {
      expect(roleCan("platform_admin", capability)).toBe(true);
    }
  });

  it("keeps analysts to aggregates", () => {
    expect(roleCan("analyst", "viewDashboard")).toBe(true);
    expect(roleCan("analyst", "viewStudents")).toBe(false);
    expect(roleCan("analyst", "export")).toBe(false);
  });

  it("only lets housing admins manage the team and privacy", () => {
    for (const role of STAFF_ROLES) {
      expect(roleCan(role, "manageTeam")).toBe(role === "housing_admin");
      expect(roleCan(role, "managePrivacy")).toBe(role === "housing_admin");
      expect(roleCan(role, "configureEscalation")).toBe(role === "housing_admin");
    }
  });

  it("lets moderators and housing admins moderate", () => {
    expect(roleCan("moderator", "moderate")).toBe(true);
    expect(roleCan("housing_admin", "moderate")).toBe(true);
    expect(roleCan("analyst", "moderate")).toBe(false);
    expect(roleCan("ra", "moderate")).toBe(false);
  });

  it("gives every role a home page", () => {
    for (const role of STAFF_ROLES) expect(roleCan(role, "home")).toBe(true);
  });
});

describe("parseScopes", () => {
  it("tolerates junk and keeps only string building names", () => {
    expect(parseScopes({ buildings: ["A", 3, null, "B"] })).toEqual({
      buildings: ["A", "B"],
      communities: [],
      accommodations: false,
    });
    expect(parseScopes({ accommodations: true }).accommodations).toBe(true);
    expect(parseScopes(null)).toEqual({ buildings: [], communities: [], accommodations: false });
  });
});

describe("invite tokens", () => {
  it("stores only a hash that matches the emailed token", () => {
    const { token, hash } = newInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });

  it("expires after 7 days", () => {
    const now = new Date("2026-11-03T00:00:00Z");
    expect(inviteExpiry(now).toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });
});
