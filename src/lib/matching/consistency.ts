/**
 * Answer-consistency checks (1.D). Pure. Gentle, private prompts for answers that pull in
 * different directions or describe an "ideal everything" roommate. They never change a
 * score, never block saving and are never shown to anyone else.
 */

export interface ConsistencyInput {
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  study: string;
  smoking: string;
  drinking: string;
  /** 0 = skipped ("doesn't matter"): rules about a skipped factor stay quiet. */
  weights: Partial<Record<string, number>>;
}

export interface ConsistencyFlag {
  ruleKey: string;
  title: string;
  message: string;
  /** The answers the rule looked at; a dismissed flag returns only when this changes. */
  signature: string;
}

interface Rule {
  key: string;
  factors: string[];
  title: string;
  message: string;
  applies: (i: ConsistencyInput) => boolean;
  signature: (i: ConsistencyInput) => string;
}

const MUST = 3;
const SCORED = ["sleep", "cleanliness", "noise", "guests", "smoking", "drinking", "pets", "study"];

export const CONSISTENCY_RULES: Rule[] = [
  {
    key: "early_sleep_loud_home",
    factors: ["sleep", "noise"],
    title: "Early nights, lively home",
    message:
      "You're asleep early but like music and TV on most of the time. These two answers pull in different directions. Want to adjust either?",
    applies: (i) => i.sleepSchedule <= 2 && i.noise >= 4,
    signature: (i) => `${i.sleepSchedule}:${i.noise}`,
  },
  {
    key: "quiet_study_loud_home",
    factors: ["study", "noise"],
    title: "Quiet study, noisy home",
    message:
      "You study at home and need it calm, and you also like it loud at home. Which matters more on a weeknight?",
    applies: (i) => i.study === "home_quiet" && i.noise >= 4,
    signature: (i) => `${i.study}:${i.noise}`,
  },
  {
    key: "quiet_study_many_guests",
    factors: ["study", "guests"],
    title: "Quiet study, lots of guests",
    message:
      "Friends over most weekends or more, and a quiet place to study at home. Both can work; it helps to say which comes first.",
    applies: (i) => i.study === "home_quiet" && i.guests >= 4,
    signature: (i) => `${i.study}:${i.guests}`,
  },
  {
    key: "spotless_many_guests",
    factors: ["cleanliness", "guests"],
    title: "Spotless, with guests constantly",
    message:
      "Everything always in its place with friends over constantly is a lot to keep up. Is one of these more of a hope than a habit?",
    applies: (i) => i.cleanliness === 5 && i.guests === 5,
    signature: (i) => `${i.cleanliness}:${i.guests}`,
  },
  {
    key: "everything_must",
    factors: [],
    title: "Everything is a must",
    message:
      "Every factor is set to must match, which shrinks your list a lot. Most people pick two or three that really matter.",
    applies: (i) => SCORED.every((f) => i.weights[f] === MUST),
    signature: (i) => SCORED.map((f) => i.weights[f] ?? "").join(""),
  },
  {
    key: "ideal_everything",
    factors: [],
    title: "The perfect roommate",
    message:
      "Spotless, quiet, rarely has guests, never smokes or drinks, and all of it a must. Honest answers get better matches than ideal ones. Want to look again?",
    applies: (i) =>
      i.cleanliness === 5 &&
      i.noise === 1 &&
      i.guests === 1 &&
      i.smoking === "never" &&
      i.drinking === "never" &&
      ["cleanliness", "noise", "guests"].every((f) => i.weights[f] === MUST),
    signature: (i) =>
      `${i.cleanliness}${i.noise}${i.guests}${i.smoking}${i.drinking}${["cleanliness", "noise", "guests"].map((f) => i.weights[f] ?? "").join("")}`,
  },
];

export function checkAnswerConsistency(input: ConsistencyInput): ConsistencyFlag[] {
  return CONSISTENCY_RULES.filter(
    (r) => r.factors.every((f) => input.weights[f] !== 0) && r.applies(input),
  ).map((r) => ({
    ruleKey: r.key,
    title: r.title,
    message: r.message,
    signature: r.signature(input),
  }));
}

/** Flags still worth showing: never dismissed, or dismissed on answers that have since changed. */
export function visibleFlags(
  flags: ConsistencyFlag[],
  dismissed: { ruleKey: string; signature: string }[],
): ConsistencyFlag[] {
  return flags.filter(
    (f) => !dismissed.some((d) => d.ruleKey === f.ruleKey && d.signature === f.signature),
  );
}
