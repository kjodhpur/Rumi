"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { runInBackground } from "@/lib/background";
import { fail, ok, type ActionResult } from "@/lib/action";
import { purgeAccount } from "@/lib/account/delete";

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
