export interface SurveyResponse {
  userId: string;
  roomAgain: "yes" | "maybe" | "no";
  score: number;
}

export interface RematchResult {
  eligible: boolean;
  carries: string[];
  leaving: string[];
  reason: string;
}

/**
 * Evaluates whether returning roommates can carry their group forward into the new term.
 * If all members said "yes" or "maybe", the whole group carries forward.
 * If one member said "no" (or graduated/leaving), a remaining pair or trio can still carry forward.
 */
export function evaluateRematchEligibility(responses: SurveyResponse[]): RematchResult {
  if (responses.length < 2) {
    return {
      eligible: false,
      carries: responses.map((r) => r.userId),
      leaving: [],
      reason: "Need at least 2 members to carry a roommate group forward.",
    };
  }

  const carries: string[] = [];
  const leaving: string[] = [];

  for (const resp of responses) {
    if (resp.roomAgain === "yes" || resp.roomAgain === "maybe") {
      carries.push(resp.userId);
    } else {
      leaving.push(resp.userId);
    }
  }

  if (carries.length >= 2) {
    const reason =
      leaving.length === 0
        ? "All roommates agreed to room together again."
        : `${leaving.length} roommate opted out or graduated; remaining ${carries.length} can carry forward.`;

    return {
      eligible: true,
      carries,
      leaving,
      reason,
    };
  }

  return {
    eligible: false,
    carries,
    leaving,
    reason: "Fewer than 2 roommates agreed to room together again.",
  };
}
