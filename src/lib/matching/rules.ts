import type { MatchProfile, SchoolRule, SchoolRuleType } from "./types";

export interface RuleEvaluation {
  allowed: boolean;
  blockingRule?: SchoolRuleType;
}

/**
 * School rules as extra hard filters (pure). A rule only bites when the values it compares
 * are known: a student who hasn't picked an academic college isn't excluded by a college rule.
 * LLC is the exception: an LLC member matches only inside their LLC.
 */
export function passesSchoolRules(
  a: MatchProfile,
  b: MatchProfile,
  rules: SchoolRule[] = [],
): RuleEvaluation {
  for (const rule of rules) {
    if (!rule.active) continue;

    switch (rule.type) {
      case "same_academic_college": {
        if (a.academicCollege && b.academicCollege && a.academicCollege !== b.academicCollege) {
          return { allowed: false, blockingRule: "same_academic_college" };
        }
        break;
      }

      case "freshman_same_college": {
        const isAFreshman = a.track === "freshman";
        const isBFreshman = b.track === "freshman";

        if (
          isAFreshman &&
          isBFreshman &&
          a.academicCollege &&
          b.academicCollege &&
          a.academicCollege !== b.academicCollege
        ) {
          return { allowed: false, blockingRule: "freshman_same_college" };
        }
        break;
      }

      case "llc_exclusive": {
        // If either belongs to a Living Learning Community, both must belong to the exact same LLC
        if ((a.llc || b.llc) && a.llc !== b.llc) {
          return { allowed: false, blockingRule: "llc_exclusive" };
        }
        break;
      }

      case "same_residential_college": {
        if (
          a.residentialCollege &&
          b.residentialCollege &&
          a.residentialCollege !== b.residentialCollege
        ) {
          return { allowed: false, blockingRule: "same_residential_college" };
        }
        break;
      }
    }
  }

  return { allowed: true };
}
