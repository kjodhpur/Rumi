import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Supabase sends the sign-in code email itself, so the template reads the language from the
 * auth user's metadata (`.Data.locale`). Kept in step with the account's language setting.
 */
export async function syncAuthLocale(
  userId: string,
  locale: Locale,
  current: unknown,
): Promise<void> {
  if (current === locale) return;
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    user_metadata: { locale },
  });
  if (error) console.error("[auth] couldn't store the sign-in email language", error.message);
}
