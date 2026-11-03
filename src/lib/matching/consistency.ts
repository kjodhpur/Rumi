export interface ConsistencyInput {
  sleepSchedule?: number | null;
  cleanliness?: number | null;
  noise?: number | null;
  guests?: number | null;
  study?: string | null;
  weights?: Record<string, number> | null;
}

export interface ConsistencyFlag {
  ruleKey: string;
  title: string;
  message: string;
  relatedFactors: string[];
}

/**
 * Pure rule engine that evaluates a student's preferences for conflicting or overly restrictive answers.
 * Returns gentle, actionable guidance. Never alters match calculations.
 */
export function checkAnswerConsistency(input: ConsistencyInput): ConsistencyFlag[] {
  const flags: ConsistencyFlag[] = [];

  // Rule 1: Sleep Schedule vs Late Noise Divergence
  if (
    typeof input.sleepSchedule === "number" &&
    input.sleepSchedule <= 2 &&
    typeof input.noise === "number" &&
    input.noise >= 4
  ) {
    flags.push({
      ruleKey: "sleep_noise_divergence",
      title: "Sleep schedule & social noise",
      message:
        "You selected an early lights-out time alongside high late-night noise. Roommates find it helpful when sleep and noise habits align.",
      relatedFactors: ["sleep", "noise"],
    });
  }

  // Rule 2: Frequent Guests vs Quiet Study Focus
  if (
    typeof input.guests === "number" &&
    input.guests >= 4 &&
    input.study &&
    (input.study === "quiet" || input.study === "silent" || input.study === "needs_quiet")
  ) {
    flags.push({
      ruleKey: "guest_study_friction",
      title: "Guests & study environment",
      message:
        "Frequent guests and an expectation of a quiet study space can pull in opposite directions in shared rooms.",
      relatedFactors: ["guests", "study"],
    });
  }

  // Rule 3: All factors set to "Must Match" (weight = 3 / sixfold importance)
  if (input.weights) {
    const weightValues = Object.values(input.weights);
    if (weightValues.length >= 7 && weightValues.every((w) => w === 3)) {
      flags.push({
        ruleKey: "all_must_weights",
        title: "All factors set to 'Must Match'",
        message:
          "Marking every factor as a strict must-have narrows your potential roommate pool significantly. Picking 2–3 non-negotiables usually gives the best balance.",
        relatedFactors: ["weights"],
      });
    }
  }

  // Rule 4: Cleanliness 5 (spotless) with max party/noise tolerance 5
  if (input.cleanliness === 5 && input.noise === 5) {
    flags.push({
      ruleKey: "cleanliness_noise_extremes",
      title: "Spotless room & maximum noise",
      message:
        "Maintaining an immaculate room while having high social activity in the space can be challenging to coordinate.",
      relatedFactors: ["cleanliness", "noise"],
    });
  }

  return flags;
}
