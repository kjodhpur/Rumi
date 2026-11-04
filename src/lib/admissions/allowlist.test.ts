import { describe, expect, it } from "vitest";
import { hashPersonalEmail, normalizeEmail, parseAllowlist } from "./allowlist";
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

  it("hashes emails like public.email_hash() and reads email or hash columns", () => {
    // Same value as SELECT public.email_hash(' JANE.DOE@gmail.com ').
    expect(hashPersonalEmail(" JANE.DOE@gmail.com ")).toBe(
      "831f6494ad6be4fcb3a724c3d5fef22d3ceffa3c62ef3a7984e45a0ea177f982",
    );
    const csv =
      "email,term\nAlex.Smith@yahoo.com,fall\nalex.smith@yahoo.com,fall\nsam@outlook.com,fall\ninvalid-row,fall\n";
    const parsed = parseAllowlist(csv);
    expect(parsed.hashes).toEqual([
      hashPersonalEmail("alex.smith@yahoo.com"),
      hashPersonalEmail("sam@outlook.com"),
    ]);
    expect(parsed.duplicates).toBe(1);
    expect(parsed.invalidRows).toEqual([4]);

    const hashed = parseAllowlist(`email_hash\n${hashPersonalEmail("a@b.co").toUpperCase()}\n`);
    expect(hashed.hashes).toEqual([hashPersonalEmail("a@b.co")]);
    expect(parseAllowlist("one@gmail.com\ntwo@gmail.com").hashes).toHaveLength(2);
  });

  it("refuses school-domain emails, which sign in with the school account", () => {
    const parsed = parseAllowlist("email\nsparky@asu.edu\nsparky@gmail.com\nx@mail.asu.edu", [
      "asu.edu",
    ]);
    expect(parsed.hashes).toEqual([hashPersonalEmail("sparky@gmail.com")]);
    expect(parsed.invalidRows).toEqual([1, 3]);
  });

  it("enforces pool separation: pre-arrival students match each other and enrolled incoming students only", () => {
    const preArrivalStudent = mockProfile({
      id: "p1",
      preArrival: true,
      track: "freshman",
      admitTermId: "fall",
    });
    const returning = mockProfile({ id: "p2", preArrival: false, track: "returning" });
    const enrolledFreshman = mockProfile({ id: "p4", preArrival: false, track: "freshman" });
    const preArrivalPeer = mockProfile({
      id: "p3",
      preArrival: true,
      track: "freshman",
      admitTermId: "fall",
    });
    const otherTerm = mockProfile({
      id: "p5",
      preArrival: true,
      track: "freshman",
      admitTermId: "spring",
    });

    // The enrolled side isn't an incoming student, so it is the one outside the pool.
    expect(hardFilterFailure(preArrivalStudent, returning)).toEqual({
      kind: "pre_arrival_pool",
      who: "b",
    });
    expect(hardFilterFailure(returning, preArrivalStudent)).toEqual({
      kind: "pre_arrival_pool",
      who: "a",
    });

    expect(hardFilterFailure(preArrivalStudent, enrolledFreshman)).toBeNull();
    expect(hardFilterFailure(preArrivalStudent, preArrivalPeer)).toBeNull();
    // Same admit term only.
    expect(hardFilterFailure(preArrivalStudent, otherTerm)).toEqual({
      kind: "pre_arrival_pool",
      who: "a",
    });
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
