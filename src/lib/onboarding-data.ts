import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingData } from "@/components/onboarding/types";
import { DEFAULT_IMPORTANCE, type FactorKey, type Importance } from "@/lib/options";
import { publicEnv } from "@/lib/env";

/**
 * Everything the onboarding wizard and the profile editor edit, shaped as
 * drafts. Returns the raw profile row too so callers can gate on its status.
 */
export async function loadProfileDrafts(userId: string) {
  const supabase = createClient();
  const [{ data: profile }, { data: settings }, { data: prefs }, { data: photos }, { data: spotify }, { data: music }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_settings").select("last_name").eq("user_id", userId).single(),
      supabase.from("preferences").select("*").eq("user_id", userId).single(),
      supabase
        .from("photos")
        .select("id, storage_path, position, placeholder, width, height")
        .eq("user_id", userId)
        .order("position"),
      supabase.from("spotify_accounts").select("display_name").eq("user_id", userId).maybeSingle(),
      supabase.from("music_profiles").select("top_artists").eq("user_id", userId).maybeSingle(),
    ]);
  if (!profile || !prefs) return null;

  const { data: areas } = await supabase
    .from("areas")
    .select("slug, name, description")
    .eq("school_id", profile.school_id)
    .order("sort_order");

  const data: Omit<OnboardingData, "initialStep"> = {
    userId,
    profile: {
      firstName: profile.first_name,
      lastName: settings?.last_name ?? "",
      pronouns: profile.pronouns ?? "",
      gender: (profile.gender as OnboardingData["profile"]["gender"]) ?? "",
      classYear: (profile.class_year as OnboardingData["profile"]["classYear"]) ?? "",
      major: profile.major ?? "",
      bio: profile.bio,
    },
    prefs: {
      budgetMin: prefs.budget_min,
      budgetMax: prefs.budget_max,
      areas: prefs.areas,
      moveInDate: prefs.move_in_date ?? "",
      leaseLength: prefs.lease_length as OnboardingData["prefs"]["leaseLength"],
      housingType: prefs.housing_type as OnboardingData["prefs"]["housingType"],
      genderPref: prefs.gender_pref as OnboardingData["prefs"]["genderPref"],
      sleepSchedule: prefs.sleep_schedule,
      cleanliness: prefs.cleanliness,
      noise: prefs.noise,
      guests: prefs.guests,
      smoking: prefs.smoking as OnboardingData["prefs"]["smoking"],
      drinking: prefs.drinking as OnboardingData["prefs"]["drinking"],
      pets: prefs.pets as OnboardingData["prefs"]["pets"],
      study: prefs.study as OnboardingData["prefs"]["study"],
      dealbreakers: prefs.dealbreakers as OnboardingData["prefs"]["dealbreakers"],
      weights: { ...DEFAULT_IMPORTANCE, ...(prefs.weights as Partial<Record<FactorKey, Importance>>) },
    },
    photos: photos ?? [],
    areas: areas ?? [],
    spotify: {
      enabled: publicEnv.spotifyEnabled,
      connected: Boolean(spotify),
      displayName: spotify?.display_name ?? null,
      artists: Array.isArray(music?.top_artists) ? (music!.top_artists as { name: string }[]).map((a) => a.name) : [],
    },
  };
  return { profile, data };
}
