"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { runInBackground } from "@/lib/background";
import { fail, ok, type ActionResult } from "@/lib/action";
import { purgeAccount } from "@/lib/account/delete";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { LOCALE_COOKIE, isSelectableLocale } from "@/lib/i18n/config";
import { syncAuthLocale } from "@/lib/auth-locale";

const privacySchema = z.object({ is_hidden: z.boolean(), verified_only: z.boolean() }).partial();

export async function updatePrivacy(input: z.input<typeof privacySchema>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return fail("Couldn't save.");
  const { error } = await createClient().from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return fail("Couldn't save. Try again.");
  revalidatePath("/matches");
  return ok();
}

export async function updateTheme(theme: "system" | "light" | "dark"): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!["system", "light", "dark"].includes(theme)) return fail("Couldn't save.");
  await createClient().from("user_settings").update({ theme }).eq("user_id", user.id);
  return ok();
}

/** Re-runs scoring now (e.g. after editing several preferences). */
export async function refreshMatches(): Promise<ActionResult<{ matches: number }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  try {
    const { matches } = await recomputeMatchesFor(user.id);
    revalidatePath("/matches");
    return ok({ matches });
  } catch {
    return fail("Couldn't refresh matches right now.");
  }
}

/**
 * Permanently deletes the account: photos in storage, direct chats, then the
 * auth user — which cascades to every row we store about them.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (confirmation.trim().toUpperCase() !== "DELETE") return fail("Type DELETE to confirm.");

  try {
    await purgeAccount(user.id);
  } catch (error) {
    console.error("[account] delete failed", error);
    return fail("We couldn't delete your account. Please try again or contact support.");
  }

  await createClient().auth.signOut();
  redirect("/?deleted=1");
}

export async function disconnectSpotify(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const admin = createAdminClient();
  await Promise.all([
    admin.from("spotify_accounts").delete().eq("user_id", user.id),
    admin.from("music_profiles").delete().eq("user_id", user.id),
  ]);
  runInBackground("recompute", () => recomputeMatchesFor(user.id));
  revalidatePath("/settings/accounts");
  return ok();
}

/** Saves the student's language and remembers it on this device. */
export async function setLocale(locale: string): Promise<ActionResult> {
  if (!isSelectableLocale(locale)) return fail("Couldn't save.");
  const user = await getUser();
  if (user) {
    if (!(await rateLimit(`locale:${user.id}`, LIMITS.localeChangesPerHour)))
      return fail("Too many changes. Try again in a bit.");
    const { error } = await createClient()
      .from("user_settings")
      .update({ locale })
      .eq("user_id", user.id);
    if (error) return fail("Couldn't save.");
    await syncAuthLocale(user.id, locale, user.user_metadata?.locale);
    // Match reasons are written in the viewer's language.
    runInBackground("recompute-locale", () => recomputeMatchesFor(user.id));
  }
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
  return ok();
}
