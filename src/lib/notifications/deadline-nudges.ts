import type { ServerSupabase } from "@/lib/supabase/server";

export type DeadlineKey = "roommate_deadline" | "selection_window" | "agreement_due";

export interface NudgeRuleRecord {
  id: string;
  schoolId: string;
  deadlineKey: DeadlineKey;
  offsets: number[];
  channels: string[];
  paused: boolean;
}

export interface NudgeContent {
  title: string;
  body: string;
  link: string;
}

export const MS_PER_DAY = 86_400_000;

/**
 * Calculates whole days remaining until a deadline.
 * Rounds down to midnight UTC to ensure consistency across execution windows.
 */
export function calculateDaysUntil(deadlineIso: string, nowIso?: string): number {
  const deadlineDate = new Date(deadlineIso);
  const now = nowIso ? new Date(nowIso) : new Date();

  const deadlineMidnight = Date.UTC(
    deadlineDate.getUTCFullYear(),
    deadlineDate.getUTCMonth(),
    deadlineDate.getUTCDate(),
  );
  const nowMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.floor((deadlineMidnight - nowMidnight) / MS_PER_DAY);
}

/**
 * Pure evaluation: should a nudge rule fire for this remaining day offset?
 */
export function evaluateNudgeEligibility(
  rule: { deadlineKey: DeadlineKey; offsets: number[]; paused: boolean },
  daysUntil: number,
): { shouldSend: boolean; offsetDays: number | null } {
  if (rule.paused) {
    return { shouldSend: false, offsetDays: null };
  }

  if (rule.offsets.includes(daysUntil)) {
    return { shouldSend: true, offsetDays: daysUntil };
  }

  return { shouldSend: false, offsetDays: null };
}

/**
 * Generates plain, actionable copy tailored to the deadline milestone and urgency.
 */
export function formatNudgeCopy(deadlineKey: DeadlineKey, offsetDays: number): NudgeContent {
  const isToday = offsetDays === 0;

  switch (deadlineKey) {
    case "roommate_deadline":
      return {
        title: isToday
          ? "Today is the roommate request deadline!"
          : `Roommate requests close in ${offsetDays} ${offsetDays === 1 ? "day" : "days"}`,
        body: isToday
          ? "Submit your final roommate request before housing locks the term pairing pool."
          : "Browse your top matches and confirm your roommate pair before the deadline.",
        link: "/matches",
      };
    case "selection_window":
      return {
        title: isToday
          ? "Room selection opens today!"
          : `Room selection window opens in ${offsetDays} ${offsetDays === 1 ? "day" : "days"}`,
        body: isToday
          ? "Your room selection window is open. Make your housing room choice now."
          : "Review your confirmed roommate group and prepare your room choices.",
        link: "/groups",
      };
    case "agreement_due":
      return {
        title: isToday
          ? "Roommate Agreement is due today!"
          : `Roommate Agreement due in ${offsetDays} ${offsetDays === 1 ? "day" : "days"}`,
        body: isToday
          ? "All roommates must review and sign your shared roommate agreement today."
          : "Take 5 minutes to agree on quiet hours, chores, and guest limits with your room.",
        link: "/groups",
      };
  }
}
