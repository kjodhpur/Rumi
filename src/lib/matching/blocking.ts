import { DEALBREAKERS } from "@/lib/options";
import { hardFilterFailure, type PoolContext } from "./engine";
import type { HardFilterFailure, MatchProfile, SchoolRuleType } from "./types";

/**
 * Why auto-pair found nobody for a student (1.C): the hard filter that blocks the most
 * of the other waiting students. Pure. Accommodation details are never named here, since
 * staff running auto-pair may not be allowed to see them.
 */
const RULE_LABEL: Record<SchoolRuleType, string> = {
  same_academic_college: "School rule: same academic college",
  same_residential_college: "School rule: same residential college",
  llc_exclusive: "School rule: LLC members match inside their LLC",
  freshman_same_college: "School rule: first-years match within their college",
};

export function describeFailure(f: HardFilterFailure): string {
  switch (f.kind) {
    case "gender":
      return "Roommate gender preferences don't overlap";
    case "dealbreaker":
      return `Dealbreaker: ${DEALBREAKERS.find((d) => d.value === f.dealbreaker)?.label.toLowerCase() ?? f.dealbreaker}`;
    case "pre_arrival_pool":
      return "Pre-arrival students match only incoming students of the same term";
    case "track_pool":
      return "Matches only within their track";
    case "accommodation":
      return "A housing constraint";
    case "school_rule":
      return RULE_LABEL[f.ruleType];
  }
}

export function blockingRule(
  student: MatchProfile,
  others: MatchProfile[],
  ctx: PoolContext = {},
): { label: string; blocked: number; of: number } | null {
  const tally = new Map<string, number>();
  let considered = 0;
  for (const other of others) {
    if (other.id === student.id) continue;
    considered += 1;
    const failure = hardFilterFailure(student, other, ctx);
    if (!failure) continue;
    const label = describeFailure(failure);
    tally.set(label, (tally.get(label) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? { label: top[0], blocked: top[1], of: considered } : null;
}
