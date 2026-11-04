import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSelectableLocale, type Locale } from "./config";
import { createTranslator, type Namespace } from "./core";
import { messagesFor, en } from "./messages";

/**
 * The request's language: a signed-in student's saved choice, else the language cookie
 * (set from the login page), else English. There's no locale in URLs.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getUser();
  if (user) {
    const { data } = await createClient()
      .from("user_settings")
      .select("locale")
      .eq("user_id", user.id)
      .maybeSingle();
    if (isSelectableLocale(data?.locale)) return data.locale;
  }
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  return isSelectableLocale(cookie) ? cookie : DEFAULT_LOCALE;
});

export async function getT<N extends Namespace>(namespace: N) {
  const locale = await getLocale();
  return createTranslator(locale, messagesFor(locale), en, namespace);
}

/** A translator for someone else (emails, notifications, match reasons written for them). */
export async function tFor<N extends Namespace>(userId: string, namespace: N) {
  const locale = await localeOf(userId);
  return { locale, t: createTranslator(locale, messagesFor(locale), en, namespace) };
}

export async function localeOf(userId: string): Promise<Locale> {
  const { data } = await createAdminClient()
    .from("user_settings")
    .select("locale")
    .eq("user_id", userId)
    .maybeSingle();
  return isSelectableLocale(data?.locale) ? data.locale : DEFAULT_LOCALE;
}

/** Locales for many users at once (batch notifications, recompute). */
export async function localesOf(userIds: string[]): Promise<Map<string, Locale>> {
  const out = new Map<string, Locale>();
  for (let i = 0; i < userIds.length; i += 150) {
    const { data } = await createAdminClient()
      .from("user_settings")
      .select("user_id, locale")
      .in("user_id", userIds.slice(i, i + 150));
    for (const row of data ?? [])
      if (isSelectableLocale(row.locale)) out.set(row.user_id, row.locale);
  }
  return out;
}
