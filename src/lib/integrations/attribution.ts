export type AttributionSource = "starrez" | "canvas" | "asuapp" | "direct" | "qr" | "email";

export const ALLOWED_SOURCES: AttributionSource[] = [
  "starrez",
  "canvas",
  "asuapp",
  "direct",
  "qr",
  "email",
];

export function normalizeSource(src: string | null | undefined): AttributionSource {
  if (!src) return "direct";
  const lower = src.toLowerCase().trim();
  if (ALLOWED_SOURCES.includes(lower as AttributionSource)) {
    return lower as AttributionSource;
  }
  return "direct";
}

/**
 * Builds a deep link for campus portals and LMS integration.
 */
export function buildDeepLink(
  schoolSlug: string,
  source: AttributionSource,
  baseUrl: string = "https://rumi.app"
): string {
  const cleanSchool = schoolSlug.toLowerCase().trim();
  return `${baseUrl}/s/${cleanSchool}?src=${source}`;
}

/**
 * Generates an HTML embed snippet for the StarRez resident portal or university websites.
 */
export function generatePortalEmbedSnippet(schoolSlug: string, schoolName: string = "ASU"): string {
  const link = buildDeepLink(schoolSlug, "starrez");
  return `<div class="rumi-portal-widget" style="padding: 1.5rem; border-radius: 12px; background: #f7f5f0; border: 1px solid #e5e0d8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; max-width: 420px;">
  <h3 style="margin: 0 0 0.5rem; color: #1e1e1e; font-size: 1.25rem; font-weight: 600;">Find Your Roommate on Rumi</h3>
  <p style="margin: 0 0 1rem; color: #5a5752; font-size: 0.9rem; line-height: 1.4;">Verified matching for ${schoolName} students. Mutual compatibility, shared lifestyle, zero swiping.</p>
  <a href="${link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.75rem 1.5rem; background: #e8542a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.95rem;">Continue with ${schoolName} Login</a>
</div>`;
}

/**
 * Generates external tool placement instructions for Canvas LMS / Blackboard.
 */
export function generateLmsLinkConfig(schoolSlug: string) {
  const url = buildDeepLink(schoolSlug, "canvas");
  return {
    title: "Find Your Roommate (Rumi)",
    url,
    description: "Verified housing & roommate matching for admitted and enrolled students.",
    target: "_blank",
    icon: "/icon.svg",
  };
}
