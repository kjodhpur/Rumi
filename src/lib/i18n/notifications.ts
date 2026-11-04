import type { Locale } from "./config";
import { translateTemplate } from "./core";
import { en, type Messages } from "./messages/en";
import { messagesFor } from "./messages";

/** A stored English notification title or body in `locale` (unchanged when unknown). */
export function localizeNotice(text: string, locale: Locale): string {
  if (locale === "en" || !text) return text;
  return localizeNoticeWith(text, messagesFor(locale));
}

/** Same, with a locale's messages already in hand (client components). */
export function localizeNoticeWith(text: string, messages: Messages): string {
  return (
    translateTemplate(text, en.notifications.templates, messages.notifications.templates) ?? text
  );
}
