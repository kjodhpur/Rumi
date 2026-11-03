import { containsPii, extractFirstName, reasonLabels } from "@/lib/share/token";

/**
 * Parent view (Phase 7.9): a read-only summary a student shares with family. Pure.
 * Never chat, never last names, emails or rooms. A roommate appears by first name and
 * photo only when that roommate turned on family_view; otherwise "Your student's roommate".
 */

export interface FamilyShareScope {
  include_agreement: boolean;
}

export function parseScope(value: unknown): FamilyShareScope {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return { include_agreement: v.include_agreement !== false };
}

export interface ParentRoommateInput {
  firstName: string | null;
  avatarUrl: string | null;
  consented: boolean;
  /** The student's match score and reasons with this roommate, if they have one. */
  score: number | null;
  reasons: unknown;
}

export interface ParentRoommate {
  name: string;
  avatarUrl: string | null;
  score: number | null;
  reasons: string[];
}

export interface ParentSummary {
  studentFirstName: string;
  studentAvatarUrl: string | null;
  groupName: string | null;
  roommates: ParentRoommate[];
  agreementStatus: "draft" | "signed" | "reopened" | null;
  expiresAt: string;
}

export function buildParentSummary(input: {
  studentFirstName: string | null;
  studentAvatarUrl: string | null;
  groupName: string | null;
  roommates: ParentRoommateInput[];
  agreementStatus: string | null;
  scope: FamilyShareScope;
  expiresAt: string;
}): ParentSummary {
  const agreement = input.agreementStatus === "draft" || input.agreementStatus === "signed" || input.agreementStatus === "reopened" ? input.agreementStatus : null;
  return {
    studentFirstName: extractFirstName(input.studentFirstName, "Your student"),
    studentAvatarUrl: input.studentAvatarUrl,
    groupName: input.groupName && !containsPii(input.groupName) ? input.groupName : null,
    roommates: input.roommates.map((r) => ({
      name: r.consented ? extractFirstName(r.firstName, "Roommate") : "Your student's roommate",
      avatarUrl: r.consented ? r.avatarUrl : null,
      score: r.score === null ? null : Math.max(0, Math.min(100, Math.round(r.score))),
      reasons: reasonLabels(r.reasons).filter((t) => !containsPii(t)).slice(0, 3),
    })),
    agreementStatus: input.scope.include_agreement ? agreement : null,
    expiresAt: input.expiresAt,
  };
}

/** Family links last until the next term starts (or 60 days without one), at most 180 days. */
export function familyLinkExpiry(now: Date, nextTermStart: string | null): Date {
  const cap = now.getTime() + 180 * 86_400_000;
  if (nextTermStart) {
    const start = Date.parse(`${nextTermStart}T00:00:00Z`);
    if (start > now.getTime() + 86_400_000) return new Date(Math.min(start, cap));
  }
  return new Date(now.getTime() + 60 * 86_400_000);
}
