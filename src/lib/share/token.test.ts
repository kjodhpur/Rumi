import { describe, expect, it } from "vitest";
import {
  buildSafeMatchShareCard,
  calculateTokenExpiry,
  containsPii,
  deriveShareToken,
  extractFirstName,
  hashShareToken,
  isShareTokenValid,
  isTokenShaped,
  reasonLabels,
  tokenMatches,
} from "./token";

const KEY = "a".repeat(64);
const OTHER_KEY = "b".repeat(64);
const ID = "4f1c2a8e-1d1b-4c5e-9b8f-7e6d5c4b3a21";

describe("derived share tokens", () => {
  it("are stable per row and kind, and differ across kinds, rows and keys", () => {
    const t = deriveShareToken(KEY, "match", ID);
    expect(t).toBe(deriveShareToken(KEY, "match", ID));
    expect(isTokenShaped(t)).toBe(true);
    expect(t).not.toBe(deriveShareToken(KEY, "family", ID));
    expect(t).not.toBe(deriveShareToken(KEY, "match", ID.replace("a21", "a22")));
    expect(t).not.toBe(deriveShareToken(OTHER_KEY, "match", ID));
  });

  it("stores only a SHA-256 of the token", () => {
    const t = deriveShareToken(KEY, "calendar", ID);
    const hash = hashShareToken(t);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(t);
  });

  it("checks ownership in constant time and rejects junk", () => {
    const t = deriveShareToken(KEY, "match", ID);
    expect(tokenMatches(KEY, "match", ID, t)).toBe(true);
    expect(tokenMatches(KEY, "match", ID, t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBe(false);
    expect(isTokenShaped("../../etc/passwd")).toBe(false);
    expect(isTokenShaped(undefined)).toBe(false);
  });

  it("refuses a malformed key", () => {
    expect(() => deriveShareToken("short", "match", ID)).toThrow();
  });
});

describe("expiry and validity", () => {
  it("expires after 14 days", () => {
    expect(calculateTokenExpiry(new Date("2026-11-03T00:00:00Z")).toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });

  it("needs both students' consent, no revocation, and an unexpired link", () => {
    const now = new Date("2026-11-03T00:00:00Z");
    const live = { userAConsented: true, userBConsented: true, expiresAt: "2026-11-17T00:00:00Z", revokedAt: null };
    expect(isShareTokenValid(live, now)).toBe(true);
    expect(isShareTokenValid({ ...live, userBConsented: false }, now)).toBe(false);
    expect(isShareTokenValid({ ...live, revokedAt: "2026-11-02T00:00:00Z" }, now)).toBe(false);
    expect(isShareTokenValid({ ...live, expiresAt: "2026-11-02T00:00:00Z" }, now)).toBe(false);
  });
});

describe("the share card never carries PII", () => {
  it("keeps first names only and up to three reason labels", () => {
    const card = buildSafeMatchShareCard({
      nameA: "Maria Gonzalez",
      nameB: "sam@asu.edu",
      score: 91.6,
      reasons: [
        { key: "sleep", label: "You're both night owls" },
        { key: "areas", label: "Call me at 480-555-1234" },
        { key: "budget", label: "Budgets overlap by $200" },
        { key: "noise", label: "You both like a quiet place" },
        { key: "music", label: "You both listen to Phoebe Bridgers" },
      ],
    });
    expect(card).toMatchInlineSnapshot(`
      {
        "firstNames": [
          "Maria",
          "sam",
        ],
        "initials": [
          "M",
          "S",
        ],
        "reasons": [
          "You're both night owls",
          "Budgets overlap by $200",
          "You both like a quiet place",
        ],
        "score": 92,
      }
    `);
    const text = JSON.stringify(card);
    expect(text).not.toMatch(/Gonzalez|@|555/);
  });

  it("ignores anything that isn't a reason label", () => {
    expect(reasonLabels([{ key: "x", label: "ok" }, "plain string", null, { label: 3 }])).toEqual(["ok"]);
    expect(reasonLabels("nope")).toEqual([]);
  });

  it("detects emails and phone numbers", () => {
    expect(containsPii("write me at a.b@example.com")).toBe(true);
    expect(containsPii("(480) 555-1234")).toBe(true);
    expect(containsPii("You both like a quiet place")).toBe(false);
    expect(extractFirstName("  ", "Student")).toBe("Student");
  });
});
