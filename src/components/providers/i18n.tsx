"use client";

import * as React from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Namespace, type Translator } from "@/lib/i18n/core";

export type { Translator };
import { en, type Messages } from "@/lib/i18n/messages/en";
import { localizeOptions } from "@/lib/i18n/options";
import { localizeErrorWith } from "@/lib/i18n/errors";

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

/** lib/options lists with labels in the reader's language. */
export function useOptions() {
  const t = useT("options");
  return React.useMemo(() => localizeOptions(t), [t]);
}

/** Translates a known English validation or server message into the reader's language. */
export function useLocalizeError() {
  const { locale, messages } = React.useContext(Context);
  return React.useCallback(
    (message: string) => (locale === "en" ? message : localizeErrorWith(message, messages.errors)),
    [locale, messages],
  );
}

/** The reader's whole message tree (for template-matching stored English text). */
export function useMessages() {
  return React.useContext(Context).messages;
}
