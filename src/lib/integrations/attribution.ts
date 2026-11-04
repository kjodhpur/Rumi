/**
 * Entry points and source attribution (Phase 2c + 3.3). Pure.
 * Links look like /s/<school>?src=starrez|canvas|asuapp|qr|email; anything else is "direct".
 */

export const SOURCES = ["starrez", "canvas", "asuapp", "qr", "email", "direct"] as const;
export type AttributionSource = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<AttributionSource, string> = {
  starrez: "StarRez portal",
  canvas: "Canvas",
  asuapp: "Campus app",
  qr: "QR code",
  email: "Housing email",
  direct: "Direct",
};

/** Cookie that carries the source from the landing page to the end of onboarding. */
export const SOURCE_COOKIE = "rumi_src";
export const SOURCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function normalizeSource(src: string | null | undefined): AttributionSource {
  const lower = (src ?? "").toLowerCase().trim();
  return (SOURCES as readonly string[]).includes(lower) ? (lower as AttributionSource) : "direct";
}

export function isSchoolSlug(value: string) {
  return /^[a-z0-9-]{2,40}$/.test(value);
}

export function buildDeepLink(baseUrl: string, school: string, source: AttributionSource): string {
  const base = baseUrl.replace(/\/$/, "");
  const path = `${base}/s/${encodeURIComponent(school.toLowerCase())}`;
  return source === "direct" ? path : `${path}?src=${source}`;
}

/** The cookie value is "<school>.<source>.<signature>"; the signature is checked server-side. */
export function sourceCookieValue(school: string, source: AttributionSource, signature: string) {
  return `${school}.${source}.${signature}`;
}

export function parseSourceCookie(
  value: string | undefined,
): { school: string; source: AttributionSource; signature: string } | null {
  const parts = (value ?? "").split(".");
  if (parts.length !== 3) return null;
  const [school, source, signature] = parts;
  if (
    !isSchoolSlug(school) ||
    normalizeSource(source) !== source ||
    !/^[0-9a-f]{64}$/.test(signature)
  )
    return null;
  return { school, source: source as AttributionSource, signature };
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

/**
 * A self-contained button for a housing portal page (StarRez resident portal, a department
 * site). Inline styles only, since portals strip stylesheets; the colors are Rumi's ink and Ember.
 */
export function portalEmbedSnippet(
  baseUrl: string,
  school: string,
  schoolShortName: string,
): string {
  const href = escapeHtml(buildDeepLink(baseUrl, school, "starrez"));
  const name = escapeHtml(schoolShortName);
  return `<a href="${href}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:12px;background:#e8542a;color:#ffffff;font:600 15px/1.2 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;text-decoration:none;">Find your roommate on Rumi</a>
<p style="margin:8px 0 0;font:400 13px/1.4 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#6f6a62;">Free for ${name} students. Rumi is an independent service.</p>`;
}

/** What staff paste into a Canvas module as an external URL (LTI is out of scope). */
export function canvasLink(baseUrl: string, school: string) {
  return {
    title: "Find your roommate on Rumi",
    url: buildDeepLink(baseUrl, school, "canvas"),
    openInNewTab: true,
  };
}
