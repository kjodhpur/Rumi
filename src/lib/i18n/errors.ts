import { LOCALE_COOKIE, isSelectableLocale, type Locale } from "./config";
import { interpolate } from "./core";
import { en } from "./messages/en";

type Entry = { key: keyof typeof en.errors; pattern: RegExp | null; names: string[] };

const entries: Entry[] = (Object.keys(en.errors) as (keyof typeof en.errors)[]).map((key) => {
  const text = en.errors[key];
  const names = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  if (!names.length) return { key, pattern: null, names };
  const source = text
    .split(/\{\w+\}/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("(.+?)");
  return { key, pattern: new RegExp(`^${source}$`), names };
});
const exact = new Map(entries.filter((e) => !e.pattern).map((e) => [en.errors[e.key], e.key]));

/** The same message from `messages` (a locale's errors), when it's one we know. */
export function localizeErrorWith(message: string, messages: typeof en.errors): string {
  const key = exact.get(message);
  if (key) return messages[key];
  for (const e of entries) {
    const match = e.pattern?.exec(message);
    if (match)
      return interpolate(
        messages[e.key],
        Object.fromEntries(e.names.map((name, i) => [name, match[i + 1] ?? ""])),
      );
  }
  return message;
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

export { LOCALE_COOKIE };
