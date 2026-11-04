import type { Locale } from "../config";
import { withFallback } from "../core";
import { en, type Messages } from "./en";
import { es } from "./es";
import { zh } from "./zh";
import { hi } from "./hi";

export { en, type Messages };

const cache = new Map<Locale, Messages>();

/** Complete messages for a locale; structure-only locales fall back to English. */
export function messagesFor(locale: Locale): Messages {
  let m = cache.get(locale);
  if (!m) {
    m = locale === "en" ? en : locale === "es" ? es : withFallback(locale === "zh" ? zh : hi, en);
    cache.set(locale, m);
  }
  return m;
}
