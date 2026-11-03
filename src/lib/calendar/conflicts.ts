export interface CalendarEvent {
  id: string;
  kind: "guest" | "quiet" | "away" | "shared";
  title: string;
  startsAt: string | Date;
  endsAt: string | Date;
  overnight: boolean;
  guestCount: number;
}

export interface ConflictCheckResult {
  hasWarning: boolean;
  warnings: string[];
}

export const DEFAULT_WEEKLY_OVERNIGHT_LIMIT = 2;

/**
 * Checks whether an event causes a policy conflict or overlaps with quiet hours:
 * 1. Overnight guest count in the surrounding 7 days vs agreed limit.
 * 2. Overlap between guest events and scheduled quiet/exam hours.
 */
export function checkCalendarConflicts(
  target: {
    kind: "guest" | "quiet" | "away" | "shared";
    title: string;
    startsAt: string | Date;
    endsAt: string | Date;
    overnight: boolean;
    guestCount: number;
    excludeEventId?: string;
  },
  existingEvents: CalendarEvent[],
  overnightWeeklyLimit: number = DEFAULT_WEEKLY_OVERNIGHT_LIMIT,
): ConflictCheckResult {
  const warnings: string[] = [];

  const targetStart = new Date(target.startsAt).getTime();
  const targetEnd = new Date(target.endsAt).getTime();

  // 1. Check quiet-hours overlap
  if (target.kind === "guest") {
    for (const event of existingEvents) {
      if (event.id === target.excludeEventId) continue;
      if (event.kind === "quiet") {
        const evStart = new Date(event.startsAt).getTime();
        const evEnd = new Date(event.endsAt).getTime();

        // Check time interval overlap
        if (targetStart < evEnd && targetEnd > evStart) {
          warnings.push(`Overlaps with scheduled quiet hours: "${event.title}".`);
        }
      }
    }
  }

  // 2. Check overnight limit within a 7-day sliding window (3 days before to 3 days after)
  if (target.kind === "guest" && target.overnight) {
    const windowStart = targetStart - 3.5 * 86_400_000;
    const windowEnd = targetStart + 3.5 * 86_400_000;

    let existingOvernights = 0;
    for (const event of existingEvents) {
      if (event.id === target.excludeEventId) continue;
      if (event.kind === "guest" && event.overnight) {
        const evStart = new Date(event.startsAt).getTime();
        if (evStart >= windowStart && evStart <= windowEnd) {
          existingOvernights += 1;
        }
      }
    }

    const totalOvernights = existingOvernights + 1;
    if (totalOvernights > overnightWeeklyLimit) {
      warnings.push(
        `This is overnight guest #${totalOvernights} this week. Your agreement limits overnights to ${overnightWeeklyLimit} per week.`,
      );
    }
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  };
}
