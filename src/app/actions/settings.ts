"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const prefsSchema = z.object({
  paused: z.boolean().optional(),
  hideProfile: z.boolean().optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
  showSocialLinks: z.boolean().optional(),
});

export async function updatePrivacySettings(input: unknown) {
  const data = prefsSchema.parse(input);
  const { supabase, user } = await requireUser();
  const patch: Record<string, unknown> = {};
  if (data.paused !== undefined) patch.paused = data.paused;
  if (data.hideProfile !== undefined) patch.hide_profile = data.hideProfile;
  if (data.themePreference !== undefined) patch.theme_preference = data.themePreference;
  if (data.showSocialLinks !== undefined) patch.show_social_links = data.showSocialLinks;
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

const notifSchema = z.object({
  inAppIntros: z.boolean(),
  inAppMessages: z.boolean(),
  inAppMatches: z.boolean(),
  emailIntros: z.boolean(),
  emailMessages: z.boolean(),
  emailMatches: z.boolean(),
});

export async function updateNotificationPreferences(input: unknown) {
  const data = notifSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    in_app_intros: data.inAppIntros,
    in_app_messages: data.inAppMessages,
    in_app_matches: data.inAppMatches,
    email_intros: data.emailIntros,
    email_messages: data.emailMessages,
    email_matches: data.emailMatches,
  });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function exportMyData() {
  const { supabase, user } = await requireUser();
  const [
    { data: profile },
    { data: housing },
    { data: lifestyle },
    { data: links },
    { data: orgs },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("housing_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("lifestyle_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("social_links").select("provider, handle, url, verified").eq("user_id", user.id),
    supabase.from("profile_orgs").select("org_id").eq("user_id", user.id),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    housing,
    lifestyle,
    socialLinks: links,
    orgIds: (orgs ?? []).map((o) => o.org_id),
  };
}

export async function deleteAccount() {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
