/**
 * Phase 8 multilingual. English and Spanish are complete for student flows; staff screens
 * stay in English. Mandarin and Hindi are structure-ready only: their files hold no
 * strings until a professional translation is done (never machine-translated), and they
 * aren't offered in the language picker until then.
 */
export const LOCALES = ["en", "es", "zh", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "rumi_locale";

export const LOCALE_INFO: Record<
  Locale,
  {
    name: string;
    native: string;
    status: "complete" | "needs_professional_translation";
    intl: string;
  }
> = {
  en: { name: "English", native: "English", status: "complete", intl: "en-US" },
  es: { name: "Spanish", native: "Español", status: "complete", intl: "es-US" },
  zh: { name: "Mandarin", native: "中文", status: "needs_professional_translation", intl: "zh-CN" },
  hi: { name: "Hindi", native: "हिन्दी", status: "needs_professional_translation", intl: "hi-IN" },
};

/** Languages a student can pick today. */
export const SELECTABLE_LOCALES = LOCALES.filter((l) => LOCALE_INFO[l].status === "complete");

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isSelectableLocale(value: unknown): value is Locale {
  return isLocale(value) && SELECTABLE_LOCALES.includes(value);
}
