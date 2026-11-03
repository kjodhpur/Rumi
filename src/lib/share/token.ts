import { createHash, randomBytes } from "node:crypto";

export const SHARE_TOKEN_EXPIRY_DAYS = 14;

export interface ShareTokenData {
  id: string;
  userA: string;
  userB: string;
  userAConsented: boolean;
  userBConsented: boolean;
  expiresAt: string;
  revokedAt: string | null;
}

/** Generates a high-entropy 32-byte hex token. */
export function generateRawShareToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 hash of the token for storage and lookup. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** Calculates expiry 14 days into the future. */
export function calculateTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_TOKEN_EXPIRY_DAYS * 86_400_000);
}

/**
 * Validates whether a token record is active and authorized for public view:
 * 1. Both students have given consent
 * 2. Token has not expired
 * 3. Token has not been revoked
 */
export function isShareTokenValid(record: {
  userAConsented: boolean;
  userBConsented: boolean;
  expiresAt: string | Date;
  revokedAt: string | Date | null;
}, now: Date = new Date()): boolean {
  if (!record.userAConsented || !record.userBConsented) {
    return false;
  }
  if (record.revokedAt) {
    return false;
  }
  const expiry = typeof record.expiresAt === "string" ? new Date(record.expiresAt) : record.expiresAt;
  return expiry.getTime() > now.getTime();
}

/**
 * Extracts first name safely, trimming any full name or email input.
 */
export function extractFirstName(raw: string | null | undefined, fallback: string = "Roommate"): string {
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/@.+$/, "");
  const first = cleaned.split(/\s+/)[0];
  return first && first.length > 0 ? first : fallback;
}

/**
 * PII safety guard: ensures string does not contain an email address,
 * full phone number, or known forbidden sensitive data.
 */
export function containsPii(text: string): boolean {
  // Email pattern
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) return true;
  // Phone pattern
  if (/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(text)) return true;
  return false;
}

export interface SafeMatchShareCard {
  firstNames: [string, string];
  initials: [string, string];
  score: number;
  reasons: string[];
}

/**
 * Builds completely sanitized match card data with zero PII:
 * - Only first names
 * - Initials
 * - Score
 * - Max 3 top reasons, filtered of any email/phone PII
 */
export function buildSafeMatchShareCard(input: {
  nameA: string | null | undefined;
  nameB: string | null | undefined;
  score: number;
  reasons?: string[] | null;
}): SafeMatchShareCard {
  const firstA = extractFirstName(input.nameA, "Student");
  const firstB = extractFirstName(input.nameB, "Student");

  const initialA = firstA.charAt(0).toUpperCase() || "S";
  const initialB = firstB.charAt(0).toUpperCase() || "S";

  const cleanScore = Math.max(0, Math.min(100, Math.round(input.score)));

  const rawReasons = Array.isArray(input.reasons) ? input.reasons : [];
  const safeReasons = rawReasons
    .filter((r): r is string => typeof r === "string" && !containsPii(r) && r.trim().length > 0)
    .map((r) => r.trim())
    .slice(0, 3);

  return {
    firstNames: [firstA, firstB],
    initials: [initialA, initialB],
    score: cleanScore,
    reasons: safeReasons,
  };
}
