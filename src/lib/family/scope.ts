import { containsPii, extractFirstName } from "@/lib/share/token";

export interface FamilyShareScope {
  [key: string]: boolean | undefined;
  include_agreement?: boolean;
  include_photos?: boolean;
}

export interface ParentViewProfile {
  id: string;
  firstName: string;
  avatarUrl?: string | null;
}

export interface ParentMatchSummary {
  studentFirstName: string;
  studentAvatarUrl?: string | null;
  roommateDisplayName: string;
  roommateAvatarUrl?: string | null;
  score: number;
  reasons: string[];
  agreementStatus: string | null;
}

/**
 * Validates whether a family share link is currently active.
 */
export function isFamilyShareActive(
  share: {
    expiresAt: string | Date;
    revokedAt?: string | Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (share.revokedAt) return false;
  const expiry = typeof share.expiresAt === "string" ? new Date(share.expiresAt) : share.expiresAt;
  return expiry.getTime() > now.getTime();
}

/**
 * Builds sanitized, scope-enforced Parent View data.
 * Acceptance criteria:
 * 1. Roommate without consent appears strictly as "Your student's roommate".
 * 2. Roommate photos are null unless roommate explicitly consented.
 * 3. Never exposes chat messages, full names, emails, or dorm room numbers.
 */
export function buildParentViewData(input: {
  student: ParentViewProfile;
  roommate?: ParentViewProfile | null;
  roommateConsented?: boolean;
  score?: number | null;
  reasons?: string[] | null;
  agreementStatus?: string | null;
  scope?: FamilyShareScope;
}): ParentMatchSummary {
  const studentFirst = extractFirstName(input.student.firstName, "Student");

  let roommateDisplayName = "Your student's roommate";
  let roommateAvatarUrl: string | null = null;

  if (input.roommate) {
    if (input.roommateConsented) {
      roommateDisplayName = extractFirstName(input.roommate.firstName, "Roommate");
      if (input.scope?.include_photos) {
        roommateAvatarUrl = input.roommate.avatarUrl || null;
      }
    }
  }

  const cleanScore = Math.max(0, Math.min(100, Math.round(input.score ?? 0)));

  const cleanReasons = (input.reasons || [])
    .filter((r): r is string => typeof r === "string" && !containsPii(r) && r.trim().length > 0)
    .slice(0, 3);

  const cleanAgreementStatus =
    input.scope?.include_agreement !== false ? input.agreementStatus || null : null;

  return {
    studentFirstName: studentFirst,
    studentAvatarUrl: input.student.avatarUrl || null,
    roommateDisplayName,
    roommateAvatarUrl,
    score: cleanScore,
    reasons: cleanReasons,
    agreementStatus: cleanAgreementStatus,
  };
}
