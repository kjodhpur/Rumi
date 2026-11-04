import { isSelectableLocale, type Locale } from "./config";
import { translateTemplate } from "./core";
import { en } from "./messages/en";

/** The same message from `messages` (a locale's errors), when it's one we know. */
export function localizeErrorWith(message: string, messages: typeof en.errors): string {
  return translateTemplate(message, en.errors, messages) ?? message;
}

/** The request's language from its cookie (server actions); English outside a request. */
export function requestLocale(read: () => string | undefined): Locale {
  try {
    const value = read();
    return isSelectableLocale(value) ? value : "en";
  } catch {
    return "en";
  }
}

export { LOCALE_COOKIE } from "./config";
