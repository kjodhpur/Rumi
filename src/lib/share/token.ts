import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Link tokens for share cards (/m/[token]), family links (/parent/[token]) and room
 * calendar feeds (/api/calendar/[token]).
 *
 * The token is an HMAC of the row id under the server key, so it can be shown again to the
 * people it belongs to, but the database stores only its SHA-256. A database read never
 * yields a working link, and revoking or rotating a link means a new row (a new id).
 */

export type ShareKind = "match" | "family" | "calendar";

export const SHARE_TOKEN_EXPIRY_DAYS = 14;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function deriveShareToken(keyHex: string, kind: ShareKind, id: string): string {
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error("A 64-character hex key is required.");
  return createHmac("sha256", Buffer.from(keyHex, "hex")).update(`${kind}:${id}`).digest("base64url");
}

/** SHA-256 (hex) of a token, for storage and lookup. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before any database lookup. */
export function isTokenShaped(token: string | undefined | null): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/** Constant-time check that a token belongs to a row (used after the hash lookup). */
export function tokenMatches(keyHex: string, kind: ShareKind, id: string, token: string): boolean {
  const expected = Buffer.from(deriveShareToken(keyHex, kind, id));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function calculateTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_TOKEN_EXPIRY_DAYS * 86_400_000);
}

/** Live means: both students consented, not revoked, not expired. */
export function isShareTokenValid(
  record: {
    userAConsented: boolean;
    userBConsented: boolean;
    expiresAt: string | Date;
    revokedAt: string | Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (!record.userAConsented || !record.userBConsented || record.revokedAt) return false;
  const expiry = typeof record.expiresAt === "string" ? new Date(record.expiresAt) : record.expiresAt;
  return expiry.getTime() > now.getTime();
}

/** First word of a name, with anything after an @ dropped. */
export function extractFirstName(raw: string | null | undefined, fallback = "Roommate"): string {
  if (!raw) return fallback;
  const first = raw.trim().replace(/@.+$/, "").split(/\s+/)[0];
  return first && first.length > 0 ? first : fallback;
}

/** True when text looks like it holds an email address or a phone number. */
export function containsPii(text: string): boolean {
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) return true;
  return /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(text);
}

export interface SafeMatchShareCard {
  firstNames: [string, string];
  initials: [string, string];
  score: number;
  reasons: string[];
}

/** Reason labels from match_scores.reasons ([{ key, label }]); anything else is ignored. */
export function reasonLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (item && typeof item === "object" && "label" in item ? (item as { label: unknown }).label : null))
    .filter((label): label is string => typeof label === "string");
}

/**
 * The only data a share card or its image may show: first names, initials, the score and
 * up to three reasons. Never a last name, email, building, photo or watch-out.
 */
export function buildSafeMatchShareCard(input: {
  nameA: string | null | undefined;
  nameB: string | null | undefined;
  score: number;
  reasons?: unknown;
}): SafeMatchShareCard {
  const firstA = extractFirstName(input.nameA, "Student");
  const firstB = extractFirstName(input.nameB, "Student");
  return {
    firstNames: [firstA, firstB],
    initials: [firstA.charAt(0).toUpperCase() || "S", firstB.charAt(0).toUpperCase() || "S"],
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    reasons: reasonLabels(input.reasons)
      .map((r) => r.trim())
      .filter((r) => r.length > 0 && !containsPii(r))
      .slice(0, 3),
  };
}
