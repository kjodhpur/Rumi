import { getLocale } from "@/lib/i18n/server";
import { messagesFor } from "@/lib/i18n/messages";
import { I18nProvider } from "./i18n";

/** Server wrapper for student screens: resolves the language and hands its strings down. */
export async function WithI18n({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
      {children}
    </I18nProvider>
  );
}
