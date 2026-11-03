/**
 * Mandarin Chinese (Simplified) dictionary scaffold.
 * STATUS: needs professional translation (per Master Prompt §8).
 * Do NOT machine-translate and ship unverified.
 */
import { TranslationDictionary } from "../types";
import { en } from "./en";

export const zhStatus = "needs_professional_translation" as const;

// Fallback to English pending certified professional translation
export const zh: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: "保存",
    cancel: "取消",
    continue: "继续",
  },
};
