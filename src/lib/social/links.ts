export type SocialPlatform = "instagram" | "linkedin";

export interface SocialLink {
  id: string;
  userId: string;
  platform: SocialPlatform;
  handle: string;
  verificationCode: string | null;
  verifiedAt: string | null;
  url: string;
}

export interface MutualContact {
  userId: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
}

/**
 * Cleans a user-submitted handle, removing leading @, slashes, or full URLs.
 * e.g. "https://instagram.com/asu_student" -> "asu_student"
 * e.g. "@sparky_asu" -> "sparky_asu"
 */
export function cleanHandle(platform: SocialPlatform, input: string): string {
  let cleaned = input.trim();
  // Strip protocol and domain if full URL was pasted
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?(instagram\.com\/|linkedin\.com\/(in\/)?)/i, "");
  // Strip leading @, trailing slashes, or query params
  cleaned = cleaned.replace(/^@+/, "");
  cleaned = cleaned.split("?")[0]!;
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned.trim();
}

/**
 * Builds the canonical public profile URL for a platform handle.
 */
export function buildSocialUrl(platform: SocialPlatform, handle: string): string {
  const clean = cleanHandle(platform, handle);
  if (platform === "instagram") {
    return `https://instagram.com/${clean}`;
  }
  return `https://linkedin.com/in/${clean}`;
}

/**
 * Generates an uppercase verification code to paste in bio/headline.
 * e.g. "RUMI-7K3B"
 */
export function generateVerificationCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No confusing 0/O or 1/I
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RUMI-${code}`;
}

export function isSocialPlatform(val: string): val is SocialPlatform {
  return val === "instagram" || val === "linkedin";
}
