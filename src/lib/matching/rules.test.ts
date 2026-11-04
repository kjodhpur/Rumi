import { describe, expect, it } from "vitest";
import { passesSchoolRules } from "./rules";
import { hardFilterFailure } from "./engine";
import type { MatchProfile, SchoolRule } from "./types";

function mockProfile(overrides: Partial<MatchProfile> = {}): MatchProfile {
  return {
    id: "p1",
    firstName: "Morgan",
    gender: "nonbinary",
    prefs: {
      budgetMin: 800,
      budgetMax: 1200,
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

describe("Phase 1 Constraints: School Rules", () => {
  it("enforces same academic college rule", () => {
    const rules: SchoolRule[] = [{ type: "same_academic_college", active: true }];

    const engineer1 = mockProfile({ id: "e1", academicCollege: "Engineering" });
    const engineer2 = mockProfile({ id: "e2", academicCollege: "Engineering" });
    const businessStudent = mockProfile({ id: "b1", academicCollege: "Business" });

    // Same college passes
    expect(passesSchoolRules(engineer1, engineer2, rules).allowed).toBe(true);
    expect(hardFilterFailure(engineer1, engineer2, { schoolRules: rules })).toBeNull();

    // Different college blocked
    const checkDiff = passesSchoolRules(engineer1, businessStudent, rules);
    expect(checkDiff.allowed).toBe(false);
    expect(checkDiff.blockingRule).toBe("same_academic_college");

    const failure = hardFilterFailure(engineer1, businessStudent, { schoolRules: rules });
    expect(failure).toEqual({
      kind: "school_rule",
      who: "a",
      ruleType: "same_academic_college",
    });
  });

  it("enforces Living Learning Community (LLC) exclusivity", () => {
    const rules: SchoolRule[] = [{ type: "llc_exclusive", active: true }];

    const honorsStudent1 = mockProfile({ id: "h1", llc: "barrett_honors" });
    const honorsStudent2 = mockProfile({ id: "h2", llc: "barrett_honors" });
    const globalHealthStudent = mockProfile({ id: "g1", llc: "global_health" });
    const regularStudent = mockProfile({ id: "r1", llc: null });
    const fellowRegular = mockProfile({ id: "r2", llc: null });

    // Same LLC passes
    expect(passesSchoolRules(honorsStudent1, honorsStudent2, rules).allowed).toBe(true);

    // LLC member with non-LLC student is blocked
    expect(passesSchoolRules(honorsStudent1, regularStudent, rules).allowed).toBe(false);

    // Two different LLCs are blocked
    expect(passesSchoolRules(honorsStudent1, globalHealthStudent, rules).allowed).toBe(false);

    // Two non-LLC students pass freely
    expect(passesSchoolRules(regularStudent, fellowRegular, rules).allowed).toBe(true);
  });

  it("enforces residential college quad restrictions", () => {
    const rules: SchoolRule[] = [{ type: "same_residential_college", active: true }];

    const quadA1 = mockProfile({ id: "q1", residentialCollege: "Barrett" });
    const quadA2 = mockProfile({ id: "q2", residentialCollege: "Barrett" });
    const quadB1 = mockProfile({ id: "q3", residentialCollege: "Hassayampa" });

    expect(passesSchoolRules(quadA1, quadA2, rules).allowed).toBe(true);
    expect(passesSchoolRules(quadA1, quadB1, rules).allowed).toBe(false);
  });

  it("ignores rules when active is false", () => {
    const inactiveRules: SchoolRule[] = [{ type: "same_academic_college", active: false }];

    const engineer = mockProfile({ id: "e1", academicCollege: "Engineering" });
    const businessStudent = mockProfile({ id: "b1", academicCollege: "Business" });

    expect(passesSchoolRules(engineer, businessStudent, inactiveRules).allowed).toBe(true);
    expect(hardFilterFailure(engineer, businessStudent, { schoolRules: inactiveRules })).toBeNull();
  });
});
