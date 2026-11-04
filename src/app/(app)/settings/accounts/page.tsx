import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { isVerified } from "@/lib/verification";
import { AccountsSettings } from "@/components/settings/accounts-settings";
import { CalendarSettings } from "@/components/settings/calendar-settings";
import { configuredProviders, PROVIDER_LABEL } from "@/lib/calendar/oauth";
import { housingDatesFor } from "@/lib/calendar/housing-dates";
import { classBlocksSchema } from "@/lib/calendar/class-schedule";
import { campusToday } from "@/lib/time";

export const metadata: Metadata = { title: "Connected accounts" };
export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage({
  searchParams,
}: {
  searchParams: { spotify?: string; calendar?: string };
}) {
  const user = (await getUser())!;
  const supabase = createClient();
  const [
    { data: profile },
    { data: settings },
    { data: spotify },
    { data: music },
    { data: socialLinks },
    { data: calendars },
    { data: schedule },
    dates,
  ] = await Promise.all([
    supabase.from("profiles").select("student_verified_at").eq("id", user.id).single(),
    supabase.from("user_settings").select("email").eq("user_id", user.id).single(),
    supabase
      .from("spotify_accounts")
      .select("display_name, last_synced_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("music_profiles")
      .select("top_artists, top_genres")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("social_links")
      .select("platform, handle, verification_code, verified_at")
      .eq("user_id", user.id),
    supabase
      .from("calendar_accounts")
      .select("provider, last_sync_at, last_error")
      .eq("user_id", user.id),
    supabase
      .from("class_schedules")
      .select("source, blocks, last_sync_at, last_error")
      .eq("user_id", user.id)
      .maybeSingle(),
    housingDatesFor(user.id, campusToday()),
  ]);
  const { data: feed } =
    schedule?.source === "ics"
      ? await createAdminClient()
          .from("class_schedules")
          .select("ics_url_enc")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
  const blocks = classBlocksSchema.safeParse(schedule?.blocks ?? []);

  const artists = Array.isArray(music?.top_artists)
    ? (music!.top_artists as { name: string; image?: string | null }[]).map((a) => ({
        name: a.name,
        image: a.image ?? null,
      }))
    : [];

  const ig = (socialLinks ?? []).find((s) => s.platform === "instagram");
  const li = (socialLinks ?? []).find((s) => s.platform === "linkedin");

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
        social: {
          instagram: {
            handle: ig?.handle ?? null,
            verified: Boolean(ig?.verified_at),
            verificationCode: ig?.verification_code ?? null,
          },
          linkedin: {
            handle: li?.handle ?? null,
            verified: Boolean(li?.verified_at),
            verificationCode: li?.verification_code ?? null,
          },
        },
      }}
    >
      <CalendarSettings
        status={searchParams.calendar}
        view={{
          providers: configuredProviders().map((provider) => {
            const row = (calendars ?? []).find((c) => c.provider === provider);
            return {
              provider,
              label: PROVIDER_LABEL[provider],
              connected: Boolean(row),
              lastSyncAt: row?.last_sync_at ?? null,
              lastError: row?.last_error ?? null,
            };
          }),
          schedule: {
            source:
              schedule?.source === "ics" || schedule?.source === "manual" ? schedule.source : null,
            blocks: blocks.success ? blocks.data : [],
            hasFeed: Boolean(feed?.ics_url_enc),
            lastSyncAt: schedule?.last_sync_at ?? null,
            lastError: schedule?.last_error ?? null,
          },
          dates: dates.map(({ uid, title, date }) => ({ uid, title, date })),
        }}
      />
    </AccountsSettings>
  );
}
