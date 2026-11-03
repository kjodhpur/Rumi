/**
 * End-of-term survey (Phase 6.1) and next-year re-match (Phase 6.2). Pure.
 */

export const SURVEY_OPENS_DAYS_BEFORE_END = 21;
export const SURVEY_CLOSES_DAYS_AFTER_END = 30;
export const FRICTION_TAGS = ["noise", "guests", "cleanliness", "schedule", "communication", "other"] as const;
export type FrictionTag = (typeof FRICTION_TAGS)[number];

const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

/** The survey is open from three weeks before the term ends until a month after. */
export function surveyOpen(termEndsOn: string, today: string): boolean {
  const end = day(termEndsOn);
  const now = day(today);
  return now >= end - SURVEY_OPENS_DAYS_BEFORE_END * 86_400_000 && now <= end + SURVEY_CLOSES_DAYS_AFTER_END * 86_400_000;
}

/** The cron invites students on the day the window opens (or the first run after). */
export function shouldInvite(termEndsOn: string, today: string): boolean {
  return surveyOpen(termEndsOn, today) && day(today) <= day(termEndsOn);
}

export interface SurveyResponse {
  userId: string;
  roomAgain: "yes" | "maybe" | "no";
}

export interface RematchResult {
  /** "Keep your group?" is offered: everyone answered and at least two said yes or maybe. */
  eligible: boolean;
  /** Everyone said yes or maybe (the brief's condition for offering it as-is). */
  everyoneIn: boolean;
  carries: string[];
  leaving: string[];
  /** Members who haven't answered the survey yet. */
  waiting: string[];
}

export function evaluateRematchEligibility(memberIds: string[], responses: SurveyResponse[]): RematchResult {
  const byUser = new Map(responses.map((r) => [r.userId, r.roomAgain]));
  const waiting = memberIds.filter((id) => !byUser.has(id));
  const carries = memberIds.filter((id) => byUser.get(id) === "yes" || byUser.get(id) === "maybe");
  const leaving = memberIds.filter((id) => byUser.get(id) === "no");
  return {
    eligible: memberIds.length >= 2 && waiting.length === 0 && carries.length >= 2,
    everyoneIn: memberIds.length >= 2 && waiting.length === 0 && leaving.length === 0,
    carries,
    leaving,
    waiting,
  };
}

/** Carry forward once every staying member tapped "keep". */
export function carryForwardReady(carries: string[], keeps: Record<string, boolean>): boolean {
  return carries.length >= 2 && carries.every((id) => keeps[id] === true);
}
