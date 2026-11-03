import { describe, expect, it } from "vitest";
import { hashPersonalEmail, normalizeEmail, parseAllowlistCsv } from "./allowlist";
import { hardFilterFailure } from "@/lib/matching/engine";
import type { MatchProfile } from "@/lib/matching/types";

function mockProfile(overrides: Partial<MatchProfile> = {}): MatchProfile {
  return {
    id: "user-1",
    firstName: "Test",
    gender: "woman",
    prefs: {
      budgetMin: 800,
      budgetMax: 1200,
      areas: ["tempe"],
      moveInDate: "2026-08-15",
      leaseLength: "twelve_months",
      housingType: "off_campus",
      genderPref: ["woman"],
      sleepSchedule: 2,
      cleanliness: 3,
      noise: 2,
      guests: 2,
      smoking: "never",
      drinking: "never",
      pets: "none",
      study: "home_quiet",
      dealbreakers: [],
      weights: {},
    },
    music: null,
    ...overrides,
  };
}

describe("Admit Allowlist and Pre-arrival pool", () => {
  it("normalizes emails and generates deterministic SHA-256 hashes", () => {
    const email1 = "Jane.Doe@GMAIL.COM";
    const email2 = "   jane.doe@gmail.com   ";
    expect(normalizeEmail(email1)).toBe("jane.doe@gmail.com");
    expect(hashPersonalEmail(email1)).toBe(hashPersonalEmail(email2));
    expect(hashPersonalEmail(email1)).toHaveLength(64);
  });

  it("parses CSV rows, strips headers and duplicate entries", () => {
    const csv = `
email,term
Alex.Smith@yahoo.com,fall2026
alex.smith@yahoo.com,fall2026
sam@outlook.com,fall2026
invalid-row
`;
    const rows = parseAllowlistCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].email).toBe("alex.smith@yahoo.com");
    expect(rows[1].email).toBe("sam@outlook.com");
  });

  it("enforces pool separation: pre-arrival cannot match with regular students", () => {
    const preArrivalStudent = mockProfile({ id: "p1", preArrival: true });
    const regularStudent = mockProfile({ id: "p2", preArrival: false });
    const preArrivalPeer = mockProfile({ id: "p3", preArrival: true });

    // Pre-arrival vs regular is blocked by hardFilterFailure
    expect(hardFilterFailure(preArrivalStudent, regularStudent)).toEqual({
      kind: "pre_arrival_pool",
      who: "a",
    });
    expect(hardFilterFailure(regularStudent, preArrivalStudent)).toEqual({
      kind: "pre_arrival_pool",
      who: "b",
    });

    // Two pre-arrival students can match
    expect(hardFilterFailure(preArrivalStudent, preArrivalPeer)).toBeNull();
  });

  it("enforces track pool separation: freshman cannot match with grad student by default", () => {
    const freshman = mockProfile({ id: "f1", track: "freshman" });
    const grad = mockProfile({ id: "g1", track: "grad" });
    const transfer = mockProfile({ id: "t1", track: "transfer" });
    const fellowFreshman = mockProfile({ id: "f2", track: "freshman" });

    // Freshman vs grad blocked
    expect(hardFilterFailure(freshman, grad)).toEqual({
      kind: "track_pool",
      who: "a",
    });

    // Freshman vs transfer blocked
    expect(hardFilterFailure(freshman, transfer)).toEqual({
      kind: "track_pool",
      who: "a",
    });

    // Same track matches freely
    expect(hardFilterFailure(freshman, fellowFreshman)).toBeNull();
  });
});
