import { describe, expect, it } from "vitest";
import { checkAccommodationConflict, isAccommodationConstraintKey } from "./accommodations";
import { hardFilterFailure } from "@/lib/matching/engine";
import type { MatchProfile } from "@/lib/matching/types";

function mockProfile(overrides: Partial<MatchProfile> = {}): MatchProfile {
  return {
    id: "u1",
    firstName: "Taylor",
    gender: "nonbinary",
    prefs: {
      budgetMin: 700,
      budgetMax: 1100,
      areas: ["tempe"],
      moveInDate: "2026-08-15",
      leaseLength: "twelve_months",
      housingType: "on_campus",
      genderPref: [],
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

describe("Phase 1.E Accessibility & Accommodation-Aware Matching", () => {
  it("validates approved accommodation keys", () => {
    expect(isAccommodationConstraintKey("esa_approved")).toBe(true);
    expect(isAccommodationConstraintKey("single_bathroom")).toBe(true);
    expect(isAccommodationConstraintKey("allergen_free")).toBe(true);
    expect(isAccommodationConstraintKey("random_key")).toBe(false);
  });

  it("blocks pairings when ESA accommodation conflicts with a pet dealbreaker", () => {
    const studentWithEsa = mockProfile({
      id: "s1",
      accommodations: ["esa_approved"],
    });

    const studentWithPetDealbreaker = mockProfile({
      id: "s2",
      prefs: {
        ...mockProfile().prefs,
        pets: "none",
        dealbreakers: ["pets"],
      },
    });

    const studentPetFriendly = mockProfile({
      id: "s3",
      prefs: {
        ...mockProfile().prefs,
        pets: "none",
        dealbreakers: [],
      },
    });

    // Conflict with dealbreaker
    const check1 = checkAccommodationConflict(studentWithEsa, studentWithPetDealbreaker);
    expect(check1.conflict).toBe(true);
    expect(check1.reason).toBe("housing requirement");

    // Engine hard filter failure
    const failure = hardFilterFailure(studentWithEsa, studentWithPetDealbreaker);
    expect(failure).toEqual({
      kind: "accommodation",
      who: "a",
      constraintKey: "esa_approved",
    });

    // Pet-friendly student has no conflict
    const check2 = checkAccommodationConflict(studentWithEsa, studentPetFriendly);
    expect(check2.conflict).toBe(false);
    expect(hardFilterFailure(studentWithEsa, studentPetFriendly)).toBeNull();
  });

  it("blocks pairings when allergen_free accommodation conflicts with smoking", () => {
    const allergenFreeStudent = mockProfile({
      id: "s1",
      accommodations: ["allergen_free"],
    });

    const smoker = mockProfile({
      id: "s2",
      prefs: {
        ...mockProfile().prefs,
        smoking: "sometimes",
      },
    });

    const nonSmoker = mockProfile({
      id: "s3",
      prefs: {
        ...mockProfile().prefs,
        smoking: "never",
      },
    });

    // Conflict with smoker
    const checkSmoker = checkAccommodationConflict(allergenFreeStudent, smoker);
    expect(checkSmoker.conflict).toBe(true);
    expect(checkSmoker.reason).toBe("housing requirement");

    expect(hardFilterFailure(allergenFreeStudent, smoker)).toEqual({
      kind: "accommodation",
      who: "a",
      constraintKey: "allergen_free",
    });

    // Non-smoker has no conflict
    expect(checkAccommodationConflict(allergenFreeStudent, nonSmoker).conflict).toBe(false);
    expect(hardFilterFailure(allergenFreeStudent, nonSmoker)).toBeNull();
  });
});
