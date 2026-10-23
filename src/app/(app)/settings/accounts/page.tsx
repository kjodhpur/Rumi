import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { isVerified } from "@/lib/verification";
import { AccountsSettings } from "@/components/settings/accounts-settings";

export const metadata: Metadata = { title: "Connected accounts" };
export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage({ searchParams }: { searchParams: { spotify?: string } }) {
  const user = (await getUser())!;
  const supabase = createClient();
  const [{ data: profile }, { data: settings }, { data: spotify }, { data: music }] = await Promise.all([
    supabase.from("profiles").select("student_verified_at").eq("id", user.id).single(),
    supabase.from("user_settings").select("email").eq("user_id", user.id).single(),
    supabase.from("spotify_accounts").select("display_name, last_synced_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("music_profiles").select("top_artists, top_genres").eq("user_id", user.id).maybeSingle(),
  ]);

  const artists = Array.isArray(music?.top_artists)
    ? (music!.top_artists as { name: string; image?: string | null }[]).map((a) => ({ name: a.name, image: a.image ?? null }))
    : [];

  return (
    <AccountsSettings
      status={searchParams.spotify}
      data={{
        email: settings?.email ?? user.email ?? "",
        verified: isVerified(profile?.student_verified_at),
        google: {
          enabled: publicEnv.googleAuthEnabled,
          linked: (user.identities ?? []).some((identity) => identity.provider === "google"),
        },
        spotify: {
          enabled: publicEnv.spotifyEnabled,
          connected: Boolean(spotify),
          displayName: spotify?.display_name ?? null,
          lastSyncedAt: spotify?.last_synced_at ?? null,
          artists,
          genres: music?.top_genres ?? [],
        },
      }}
    />
  );
}
