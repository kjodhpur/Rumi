import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: notifPrefs }, { data: links }, { data: orgs }, { data: myOrgs }, { data: spotify }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("social_links").select("*").eq("user_id", user.id),
      supabase.from("campus_orgs").select("id, name").order("name"),
      supabase.from("profile_orgs").select("org_id").eq("user_id", user.id),
      supabase.from("spotify_connections").select("spotify_user_id, connected_at").eq("user_id", user.id).maybeSingle(),
    ]);

  return (
    <SettingsClient
      email={user.email ?? ""}
      profile={{
        firstName: profile?.first_name ?? "",
        lastInitial: profile?.last_initial ?? "",
        bio: profile?.bio ?? "",
        paused: Boolean(profile?.paused),
        hideProfile: Boolean(profile?.hide_profile),
        themePreference: (profile?.theme_preference as "light" | "dark" | "system") ?? "system",
        showSocialLinks: profile?.show_social_links !== false,
        photoUrl: profile?.photo_url ?? null,
      }}
      notificationPrefs={{
        inAppIntros: notifPrefs?.in_app_intros ?? true,
        inAppMessages: notifPrefs?.in_app_messages ?? true,
        inAppMatches: notifPrefs?.in_app_matches ?? true,
        emailIntros: notifPrefs?.email_intros ?? true,
        emailMessages: notifPrefs?.email_messages ?? true,
        emailMatches: notifPrefs?.email_matches ?? false,
      }}
      socialLinks={(links ?? []).map((l) => ({
        provider: l.provider,
        handle: l.handle,
        url: l.url,
      }))
      }
      campusOrgs={(orgs ?? []).map((o) => ({ id: o.id, name: o.name }))}
      selectedOrgIds={(myOrgs ?? []).map((o) => o.org_id)}
      spotifyConnected={Boolean(spotify)}
      profileId={user.id}
    />
  );
}
