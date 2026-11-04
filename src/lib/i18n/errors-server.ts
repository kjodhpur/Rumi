import type { Locale } from "./config";
import { localizeErrorWith } from "./errors";
import { messagesFor } from "./messages";

/** The same message in `locale`, when it's one we know; otherwise unchanged. */
export function localizeError(message: string, locale: Locale): string {
  return locale === "en" ? message : localizeErrorWith(message, messagesFor(locale).errors);
}
