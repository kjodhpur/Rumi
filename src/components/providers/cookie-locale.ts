"use client";

import * as React from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSelectableLocale, type Locale } from "@/lib/i18n/config";
import { pages as enPages } from "@/lib/i18n/messages/en/pages";
import { pages as esPages } from "@/lib/i18n/messages/es/pages";

/**
 * The language cookie, read in the browser. For the few screens that render without the app's
 * provider: the precached offline page and the root error boundary.
 */
export function useCookieLocale(): Locale {
  const [locale, setLocale] = React.useState<Locale>(DEFAULT_LOCALE);
  React.useEffect(() => {
    const value = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1];
    if (isSelectableLocale(value)) setLocale(value);
  }, []);
  return locale;
}

export function usePageStrings() {
  return useCookieLocale() === "es" ? esPages : enPages;
}
