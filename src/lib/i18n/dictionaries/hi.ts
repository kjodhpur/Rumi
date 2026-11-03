/**
 * Hindi dictionary scaffold.
 * STATUS: needs professional translation (per Master Prompt §8).
 * Do NOT machine-translate and ship unverified.
 */
import { TranslationDictionary } from "../types";
import { en } from "./en";

export const hiStatus = "needs_professional_translation" as const;

// Fallback to English pending certified professional translation
export const hi: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: "सहेजें",
    cancel: "रद्द करें",
    continue: "आगे बढ़ें",
  },
};
