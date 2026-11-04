"use client";

import * as React from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Namespace, type Translator } from "@/lib/i18n/core";
import { en, type Messages } from "@/lib/i18n/messages/en";

const Context = React.createContext<{ locale: Locale; messages: Messages }>({
  locale: DEFAULT_LOCALE,
  messages: en,
});

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    document.documentElement.lang = LOCALE_INFO[locale].intl.slice(0, 2);
    // Server actions answer errors in the cookie's language; keep it in step with the
    // account's choice when it was made on another device.
    const current = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1];
    if (current !== locale && (current !== undefined || locale !== DEFAULT_LOCALE))
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);
  const value = React.useMemo(() => ({ locale, messages }), [locale, messages]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale() {
  return React.useContext(Context).locale;
}

/** Intl locale for dates and numbers ("en-US", "es-US"). */
export function useIntlLocale() {
  return LOCALE_INFO[useLocale()].intl;
}

export function useT<N extends Namespace>(namespace: N): Translator<N> {
  const { locale, messages } = React.useContext(Context);
  return React.useMemo(
    () => createTranslator(locale, messages, en, namespace),
    [locale, messages, namespace],
  );
}
