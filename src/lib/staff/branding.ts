/**
 * School white-label (Phase 9). Pure. A logo, a display name ("Rumi for <name>") and an
 * optional secondary accent, applied only on staff screens and the school landing page. The
 * secondary accent is decorative (a thin band and a swatch): Rumi's own colors, Ember
 * included, stay as they are, and the student app keeps Rumi's chrome.
 */

export interface SchoolBranding {
  logoPath: string | null;
  displayName: string | null;
  secondaryAccent: string | null;
}

export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

const HEX = /^#[0-9a-f]{6}$/;
const LOGO_PATH = /^[a-z0-9-]{2,32}\/logo-[0-9a-z]+\.(png|jpg|webp)$/;

export function parseBranding(value: unknown): SchoolBranding {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const name = typeof v.display_name === "string" ? v.display_name.trim().slice(0, 60) : "";
  const accent = typeof v.secondary_accent === "string" ? v.secondary_accent.toLowerCase() : "";
  const logo = typeof v.logo_path === "string" ? v.logo_path : "";
  return {
    logoPath: LOGO_PATH.test(logo) ? logo : null,
    displayName: name || null,
    secondaryAccent: HEX.test(accent) && !accentIssue(accent) ? accent : null,
  };
}

export function toBrandingJson(b: SchoolBranding) {
  return {
    ...(b.logoPath ? { logo_path: b.logoPath } : {}),
    ...(b.displayName ? { display_name: b.displayName } : {}),
    ...(b.secondaryAccent ? { secondary_accent: b.secondaryAccent } : {}),
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rumi's page backgrounds in light and dark mode (globals.css --bg). */
const LIGHT_BG = "#f7f5f0";
const DARK_BG = "#121110";

/** Why an accent can't be used, or null. It must stay visible on both page backgrounds. */
export function accentIssue(hex: string): string | null {
  if (!HEX.test(hex)) return "Use a hex color like #8c1d40.";
  if (contrastRatio(hex, LIGHT_BG) < 1.3) return "That color is too light to see on Rumi's pages.";
  if (contrastRatio(hex, DARK_BG) < 1.3) return "That color is too dark to see in dark mode.";
  return null;
}

/** "Rumi for ASU": the school's display name, else its short name. */
export function brandName(b: SchoolBranding, shortName: string) {
  return b.displayName ?? shortName;
}

/** Sniffs the image type from its first bytes; the browser's claimed type isn't trusted. */
export function sniffLogo(bytes: Uint8Array): LogoType | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  const riff = String.fromCharCode(at(0), at(1), at(2), at(3));
  const webp = String.fromCharCode(at(8), at(9), at(10), at(11));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export const LOGO_EXT: Record<LogoType, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Public URL of a school logo in the `school-branding` bucket. */
export function logoUrl(path: string | null): string | null {
  if (!path) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/school-branding/${path}`;
}
