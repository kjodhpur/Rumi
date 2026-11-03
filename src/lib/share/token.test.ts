import { describe, expect, it } from "vitest";
import {
  buildSafeMatchShareCard,
  calculateTokenExpiry,
  containsPii,
  extractFirstName,
  generateRawShareToken,
  hashShareToken,
  isShareTokenValid,
} from "./token";

describe("share token logic", () => {
  it("generates unique 64-char hex tokens and correct hashes", () => {
    const token1 = generateRawShareToken();
    const token2 = generateRawShareToken();
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);

    const hash = hashShareToken(token1);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashShareToken(token1));
  });

  it("calculates 14-day expiry", () => {
    const base = new Date("2026-11-03T00:00:00Z");
    const expiry = calculateTokenExpiry(base);
    expect(expiry.toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });

  it("requires mutual consent from both students", () => {
    const now = new Date("2026-11-03T00:00:00Z");
    const expiresAt = new Date("2026-11-17T00:00:00Z");

    // Both consented -> valid
    expect(
      isShareTokenValid(
        { userAConsented: true, userBConsented: true, expiresAt, revokedAt: null },
        now,
      ),
    ).toBe(true);

    // Only one consented -> invalid
    expect(
      isShareTokenValid(
        { userAConsented: true, userBConsented: false, expiresAt, revokedAt: null },
        now,
      ),
    ).toBe(false);

    expect(
      isShareTokenValid(
        { userAConsented: false, userBConsented: true, expiresAt, revokedAt: null },
        now,
      ),
    ).toBe(false);
  });

  it("invalidates expired tokens", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const expiresAt = new Date("2026-11-17T00:00:00Z");
    expect(
      isShareTokenValid(
        { userAConsented: true, userBConsented: true, expiresAt, revokedAt: null },
        now,
      ),
    ).toBe(false);
  });

  it("invalidates revoked tokens immediately", () => {
    const now = new Date("2026-11-05T00:00:00Z");
    const expiresAt = new Date("2026-11-17T00:00:00Z");
    expect(
      isShareTokenValid(
        {
          userAConsented: true,
          userBConsented: true,
          expiresAt,
          revokedAt: new Date("2026-11-04T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("detects emails and phone numbers in PII check", () => {
    expect(containsPii("Reach me at alex@asu.edu")).toBe(true);
    expect(containsPii("Call 480-965-0000 anytime")).toBe(true);
    expect(containsPii("Both early risers who value quiet study time")).toBe(false);
  });

  it("extracts first names safely without email domains or full names", () => {
    expect(extractFirstName("Jordan Smith")).toBe("Jordan");
    expect(extractFirstName("alex@asu.edu")).toBe("alex");
    expect(extractFirstName(null, "Roommate")).toBe("Roommate");
  });

  it("builds safe match share card without PII and caps at 3 clean reasons", () => {
    const card = buildSafeMatchShareCard({
      nameA: "Taylor Swift",
      nameB: "Sammy Student",
      score: 94.8,
      reasons: [
        "Both wake up around 7:00 AM",
        "Email me at secret@asu.edu",
        "Both study quietly in the evenings",
        "Shared interest in Indie music",
        "Call 555-123-4567 for dorm tour",
        "Prefer clean dishes before bed",
      ],
    });

    expect(card.firstNames).toEqual(["Taylor", "Sammy"]);
    expect(card.initials).toEqual(["T", "S"]);
    expect(card.score).toBe(95);
    // Notice the 2 reasons with PII were stripped!
    expect(card.reasons).toEqual([
      "Both wake up around 7:00 AM",
      "Both study quietly in the evenings",
      "Shared interest in Indie music",
    ]);
  });
});
