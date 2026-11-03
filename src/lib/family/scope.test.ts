import { describe, expect, it } from "vitest";
import {
  buildParentViewData,
  isFamilyShareActive,
} from "./scope";

describe("parent view scope and consent enforcement", () => {
  const student = {
    id: "student-1",
    firstName: "Alex Miller",
    avatarUrl: "https://example.com/alex.jpg",
  };

  const roommate = {
    id: "roommate-1",
    firstName: "Jordan Hayes",
    avatarUrl: "https://example.com/jordan.jpg",
  };

  it("acceptance: roommate without consent appears strictly as 'Your student's roommate' only", () => {
    const summary = buildParentViewData({
      student,
      roommate,
      roommateConsented: false, // NOT consented
      score: 93.4,
      reasons: ["Both wake up early", "Value quiet study hours"],
      agreementStatus: "signed",
    });

    expect(summary.studentFirstName).toBe("Alex");
    expect(summary.roommateDisplayName).toBe("Your student's roommate");
    expect(summary.roommateAvatarUrl).toBeNull(); // Photos strictly blocked without consent
    expect(summary.score).toBe(93);
    expect(summary.agreementStatus).toBe("signed");
  });

  it("shows roommate first name when roommate explicitly consented", () => {
    const summary = buildParentViewData({
      student,
      roommate,
      roommateConsented: true, // Consented!
      score: 93.4,
      reasons: ["Both wake up early"],
      scope: { include_photos: true, include_agreement: true },
    });

    expect(summary.roommateDisplayName).toBe("Jordan");
    expect(summary.roommateAvatarUrl).toBe("https://example.com/jordan.jpg");
  });

  it("omits agreement status when scope disables it", () => {
    const summary = buildParentViewData({
      student,
      roommate,
      roommateConsented: true,
      score: 90,
      agreementStatus: "signed",
      scope: { include_agreement: false },
    });

    expect(summary.agreementStatus).toBeNull();
  });

  it("validates expiration and revocation", () => {
    const now = new Date("2026-11-03T12:00:00Z");

    // Valid active
    expect(
      isFamilyShareActive(
        { expiresAt: "2026-12-01T00:00:00Z", revokedAt: null },
        now,
      ),
    ).toBe(true);

    // Expired
    expect(
      isFamilyShareActive(
        { expiresAt: "2026-10-01T00:00:00Z", revokedAt: null },
        now,
      ),
    ).toBe(false);

    // Revoked
    expect(
      isFamilyShareActive(
        {
          expiresAt: "2026-12-01T00:00:00Z",
          revokedAt: "2026-11-02T00:00:00Z",
        },
        now,
      ),
    ).toBe(false);
  });
});
