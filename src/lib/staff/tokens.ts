import { createHash, randomBytes } from "node:crypto";

/** Invite links carry a random token; only its SHA-256 is stored, so a database leak can't be replayed. */
export function newInviteToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const INVITE_TTL_DAYS = 7;

export function inviteExpiry(now = new Date()) {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000);
}
