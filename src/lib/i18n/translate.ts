import { SupportedLocale, TranslationDictionary, DEFAULT_LOCALE } from "./types";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { zh } from "./dictionaries/zh";
import { hi } from "./dictionaries/hi";

const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  en,
  es,
  zh,
  hi,
};

export function getDictionary(locale: SupportedLocale = DEFAULT_LOCALE): TranslationDictionary {
  return DICTIONARIES[locale] || en;
}

/**
 * Pure translation lookup with fallback to English for missing keys.
 * e.g. t("onboarding.welcomeTitle", "es") -> "Encuentra a tu compañero de cuarto ideal"
 */
export function t(
  path: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
  params?: Record<string, string | number>
): string {
  const dict = getDictionary(locale);
  const parts = path.split(".");

  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to English dictionary
      current = resolvePath(en, parts);
      break;
    }
  }

  if (typeof current !== "string") {
    return path;
  }

  let text = current;
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${key}}`, "g"), String(val));
    }
  }

  return text;
}

function resolvePath(obj: unknown, parts: string[]): unknown {
  let curr = obj;
  for (const p of parts) {
    if (curr && typeof curr === "object" && p in (curr as Record<string, unknown>)) {
      curr = (curr as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return curr;
}
