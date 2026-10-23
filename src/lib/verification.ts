/** Student status lasts a year and renews on every sign-in with the school inbox. */
export const VERIFICATION_DAYS = 365;

export function verifiedUntil(verifiedAt: string | null | undefined) {
  if (!verifiedAt) return null;
  return new Date(Date.parse(verifiedAt) + VERIFICATION_DAYS * 86_400_000).toISOString();
}

export function isVerified(verifiedAt: string | null | undefined) {
  const until = verifiedUntil(verifiedAt);
  return until ? Date.parse(until) > Date.now() : false;
}
