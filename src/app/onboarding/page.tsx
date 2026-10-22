import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import type { OnboardingData } from "@/components/onboarding/types";
import { DEFAULT_IMPORTANCE, type FactorKey, type Importance } from "@/lib/options";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

const STEP_IDS = ["basics", "photos", "about", "housing", "areas", "lifestyle", "habits", "priorities", "dealbreakers", "music"];

export default async function OnboardingPage({ searchParams }: { searchParams: { step?: string } }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");
  const supabase = createClient();

  const [{ data: profile }, { data: settings }, { data: prefs }, { data: photos }, { data: spotify }, { data: music }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_settings").select("last_name").eq("user_id", user.id).single(),
      supabase.from("preferences").select("*").eq("user_id", user.id).single(),
      supabase
        .from("photos")
        .select("id, storage_path, position, placeholder, width, height")
        .eq("user_id", user.id)
        .order("position"),
      supabase.from("spotify_accounts").select("display_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("music_profiles").select("top_artists").eq("user_id", user.id).maybeSingle(),
    ]);

  if (!profile || !prefs) redirect("/login");
  if (profile.banned_at) redirect("/suspended");
  if (profile.onboarding_completed_at) redirect("/matches");

  const { data: areas } = await supabase
    .from("areas")
    .select("slug, name, description")
    .eq("school_id", profile.school_id)
    .order("sort_order");

  const requested = STEP_IDS.indexOf(searchParams.step ?? "");
  const data: OnboardingData = {
    userId: user.id,
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
      artists: Array.isArray(music?.top_artists)
        ? (music!.top_artists as { name: string }[]).map((a) => a.name)
        : [],
    },
    initialStep: requested >= 0 ? requested : profile.onboarding_step,
  };

  return <OnboardingWizard data={data} />;
}
