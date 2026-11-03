import { describe, expect, it } from "vitest";
import { buildParentSummary, familyLinkExpiry, parseScope } from "./scope";

const base = {
  studentFirstName: "Maria Gonzalez",
  studentAvatarUrl: "https://example.test/maria.webp",
  groupName: "302 crew",
  agreementStatus: "signed",
  scope: { include_agreement: true },
  expiresAt: "2027-01-12T00:00:00.000Z",
};

describe("parent view", () => {
  it("shows a roommate who didn't consent only as 'Your student's roommate', with no photo", () => {
    const view = buildParentSummary({
      ...base,
      roommates: [{ firstName: "Sam Lee", avatarUrl: "https://example.test/sam.webp", consented: false, score: 88, reasons: [{ key: "sleep", label: "You're both night owls" }] }],
    });
    expect(view.roommates[0]).toEqual({ name: "Your student's roommate", avatarUrl: null, score: 88, reasons: ["You're both night owls"] });
  });

  it("shows first name and photo when the roommate consented", () => {
    const view = buildParentSummary({ ...base, roommates: [{ firstName: "Sam Lee", avatarUrl: "https://example.test/sam.webp", consented: true, score: 91.4, reasons: [] }] });
    expect(view.roommates[0]).toMatchObject({ name: "Sam", avatarUrl: "https://example.test/sam.webp", score: 91 });
  });

  it("never carries last names, emails or phone numbers", () => {
    const view = buildParentSummary({
      ...base,
      groupName: "call 480-555-1234",
      roommates: [{ firstName: "sam@asu.edu", avatarUrl: null, consented: true, score: 70, reasons: [{ key: "x", label: "email me a@b.co" }] }],
    });
    const text = JSON.stringify(view);
    expect(text).not.toMatch(/Gonzalez|@|555/);
    expect(view.groupName).toBeNull();
  });

  it("hides the agreement status when the student left it out", () => {
    expect(buildParentSummary({ ...base, scope: parseScope({ include_agreement: false }), roommates: [] }).agreementStatus).toBeNull();
    expect(buildParentSummary({ ...base, agreementStatus: "void", roommates: [] }).agreementStatus).toBeNull();
    expect(parseScope(null)).toEqual({ include_agreement: true });
  });
});

describe("family link expiry", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  it("expires when the next term starts", () => {
    expect(familyLinkExpiry(now, "2027-01-12").toISOString()).toBe("2027-01-12T00:00:00.000Z");
  });
  it("falls back to 60 days and never runs past 180", () => {
    expect(familyLinkExpiry(now, null).toISOString()).toBe("2027-01-02T00:00:00.000Z");
    expect(familyLinkExpiry(now, "2026-11-03").toISOString()).toBe("2027-01-02T00:00:00.000Z");
    expect(familyLinkExpiry(now, "2028-01-01").toISOString()).toBe("2027-05-02T00:00:00.000Z");
  });
});
