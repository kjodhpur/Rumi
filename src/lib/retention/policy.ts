/**
 * Data retention: what is kept, for how long. Pure, so every rule is tested
 * against a fixed clock. The nightly job (./run.ts) only executes what these return.
 */

export const RETENTION_ENTITIES = [
  "orphaned_messages",
  "inactive_accounts",
  "inactive_warning",
  "audit_log",
  "checkin_notes",
] as const;
export type RetentionEntity = (typeof RETENTION_ENTITIES)[number];

export const RETENTION_DEFAULTS: Record<RetentionEntity, number> = {
  orphaned_messages: 90,
  inactive_accounts: 730,
  inactive_warning: 30,
  audit_log: 1095,
  checkin_notes: 90,
};

export const RETENTION_COPY: Record<RetentionEntity, { label: string; help: string; min: number; max: number }> = {
  orphaned_messages: {
    label: "Messages after everyone leaves",
    help: "Days a conversation's messages are kept once no members remain.",
    min: 7,
    max: 3650,
  },
  inactive_accounts: {
    label: "Inactive accounts",
    help: "Days without a sign-in before an account is deleted. Students are emailed first.",
    min: 180,
    max: 3650,
  },
  inactive_warning: {
    label: "Warning before deletion",
    help: "Days between the warning email and deletion.",
    min: 7,
    max: 90,
  },
  audit_log: {
    label: "Audit log",
    help: "Days staff activity records are kept.",
    min: 365,
    max: 3650,
  },
  checkin_notes: {
    label: "Check-in notes",
    help: "Days after the term ends that private check-in notes are kept.",
    min: 7,
    max: 365,
  },
};

const DAY = 86_400_000;

export type RetentionPolicy = Record<RetentionEntity, number>;

/** School overrides on top of the defaults; out-of-range values fall back to the default. */
export function effectivePolicy(overrides: { entity: string; days: number }[]): RetentionPolicy {
  const policy: RetentionPolicy = { ...RETENTION_DEFAULTS };
  for (const { entity, days } of overrides) {
    if (!(entity in RETENTION_COPY)) continue;
    const key = entity as RetentionEntity;
    const { min, max } = RETENTION_COPY[key];
    if (Number.isInteger(days) && days >= min && days <= max) policy[key] = days;
  }
  // A warning longer than the whole window would delete without notice.
  policy.inactive_warning = Math.min(policy.inactive_warning, policy.inactive_accounts - 1);
  return policy;
}

export function cutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY);
}

export interface InactiveCandidate {
  id: string;
  lastActiveAt: string;
  warnedAt: string | null;
}

export interface InactivePlan {
  warn: string[];
  remove: string[];
  /** Came back after a warning: clear it. */
  clear: string[];
}

/**
 * Warn at (window − warning) days of inactivity; delete only at the full window and
 * only if a warning went out at least `warning` days earlier. Never deletes unwarned.
 */
export function planInactive(people: InactiveCandidate[], policy: RetentionPolicy, now: Date): InactivePlan {
  const warnBefore = cutoff(now, policy.inactive_accounts - policy.inactive_warning).getTime();
  const removeBefore = cutoff(now, policy.inactive_accounts).getTime();
  const warnedLongEnough = cutoff(now, policy.inactive_warning).getTime();
  const plan: InactivePlan = { warn: [], remove: [], clear: [] };

  for (const person of people) {
    const lastActive = new Date(person.lastActiveAt).getTime();
    const warned = person.warnedAt ? new Date(person.warnedAt).getTime() : null;

    if (warned !== null && lastActive > warned) {
      plan.clear.push(person.id);
      continue;
    }
    if (warned === null) {
      if (lastActive <= warnBefore) plan.warn.push(person.id);
      continue;
    }
    if (lastActive <= removeBefore && warned <= warnedLongEnough) plan.remove.push(person.id);
  }
  return plan;
}
