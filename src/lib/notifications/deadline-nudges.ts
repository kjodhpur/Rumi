/**
 * Deadline-aware nudges (Phase 1.H). Pure: which deadline is due for a nudge today, who
 * needs it, and what it says. Dates are campus dates (yyyy-mm-dd).
 */

export const DEADLINE_KEYS = ["roommateRequest", "selectionOpens", "selectionCloses", "agreementDue"] as const;
export type DeadlineKey = (typeof DEADLINE_KEYS)[number];
export const DEFAULT_OFFSETS = [7, 2, 0];

export const DEADLINE_NAME: Record<DeadlineKey, string> = {
  roommateRequest: "Roommate request deadline",
  selectionOpens: "Room selection opens",
  selectionCloses: "Room selection closes",
  agreementDue: "Roommate agreement due",
};

export interface NudgeRule {
  id: string | null;
  deadlineKey: DeadlineKey;
  offsets: number[];
  channels: string[];
  paused: boolean;
}

export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}

/** The offset that fires today, if any. */
export function dueOffset(offsets: number[], deadline: string, today: string): number | null {
  const d = daysUntil(deadline, today);
  return offsets.includes(d) ? d : null;
}

export interface StudentState {
  /** In a group of two or more. */
  confirmed: boolean;
  /** Their group's agreement is signed. */
  agreementSigned: boolean;
}

/** Roommate and selection deadlines nudge students without a group; agreements nudge unsigned groups. */
export function needsNudge(key: DeadlineKey, s: StudentState): boolean {
  return key === "agreementDue" ? s.confirmed && !s.agreementSigned : !s.confirmed;
}

export interface NudgeCopy {
  title: string;
  body: string;
  href: string;
}

const when = (offset: number) => (offset === 0 ? "today" : offset === 1 ? "tomorrow" : `in ${offset} days`);

export function nudgeCopy(key: DeadlineKey, offset: number, office: string): NudgeCopy {
  switch (key) {
    case "roommateRequest":
      return {
        title: `${office}'s roommate request deadline is ${when(offset)}`,
        body: "Find your roommate on Rumi first, then add them to your housing application.",
        href: "/matches",
      };
    case "selectionOpens":
      return { title: `Room selection opens ${when(offset)}`, body: "Pair up before it opens so you can pick a room together.", href: "/matches" };
    case "selectionCloses":
      return { title: `Room selection closes ${when(offset)}`, body: "Still looking for a roommate? Your best matches are waiting.", href: "/matches" };
    case "agreementDue":
      return { title: `Your roommate agreement is due ${when(offset)}`, body: "Agree on quiet hours, guests and chores, then everyone signs.", href: "/groups" };
  }
}

/** Rules for a term: the school's saved ones, with defaults for deadlines that have none. */
export function effectiveRules(saved: NudgeRule[], deadlines: Partial<Record<DeadlineKey, string>>): NudgeRule[] {
  return DEADLINE_KEYS.filter((k) => deadlines[k]).map(
    (k) => saved.find((r) => r.deadlineKey === k) ?? { id: null, deadlineKey: k, offsets: DEFAULT_OFFSETS, channels: ["in_app", "email"], paused: false },
  );
}

export interface ScheduledSend {
  deadlineKey: DeadlineKey;
  deadline: string;
  offset: number;
  date: string;
  paused: boolean;
  past: boolean;
}

/** The staff preview: every send date for the term's deadlines. */
export function schedulePreview(rules: NudgeRule[], deadlines: Partial<Record<DeadlineKey, string>>, today: string): ScheduledSend[] {
  return rules
    .flatMap((r) =>
      [...r.offsets].sort((a, b) => b - a).map((offset) => {
        const deadline = deadlines[r.deadlineKey]!;
        const date = new Date(Date.parse(`${deadline}T12:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
        return { deadlineKey: r.deadlineKey, deadline, offset, date, paused: r.paused, past: date < today };
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
