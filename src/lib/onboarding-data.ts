import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingData } from "@/components/onboarding/types";
import { DEFAULT_IMPORTANCE, type FactorKey, type Importance } from "@/lib/options";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSchoolQuestions } from "@/lib/matching/questions";
import { loadSchoolDefaultWeights } from "@/lib/matching/default-weights";
import { parseTermConfig } from "@/lib/staff/term-config";
import type { SchoolContext, SchoolOptionKind } from "@/components/onboarding/types";

/** School option lists and this term's required questions, for onboarding and the profile editor. */
export async function loadSchoolContext(
  userId: string,
  schoolId: string,
  trackLocked: boolean,
  preArrival: boolean,
): Promise<SchoolContext> {
  const db = createAdminClient();
  const [{ data: options }, { data: term }, questions, { data: answers }] = await Promise.all([
    db
      .from("school_options")
      .select("kind, value, label")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("position"),
    db.from("terms").select("config").eq("school_id", schoolId).eq("active", true).maybeSingle(),
    loadSchoolQuestions(schoolId),
    createClient()
      .from("school_question_answers")
      .select("question_key, question_version, choice_key")
      .eq("user_id", userId),
  ]);
  const lists: SchoolContext["options"] = {
    campus: [],
    academic_college: [],
    residential_college: [],
    llc: [],
  };
  for (const o of options ?? [])
    if (o.kind in lists) lists[o.kind as SchoolOptionKind].push({ value: o.value, label: o.label });
  const requiredKeys = new Set(parseTermConfig(term?.config).requiredQuestions);
  const required = questions.filter((q) => requiredKeys.has(q.key));
  const current: Record<string, string> = {};
  for (const a of answers ?? []) {
    const q = required.find((x) => x.key === a.question_key);
    if (q && q.version === a.question_version) current[q.key] = a.choice_key;
  }
  return {
    options: lists,
    trackLocked,
    preArrival,
    required: required.map((q) => ({
      key: q.key,
      stem: q.stem,
      builtIn: !q.schoolId,
      choices: q.choices.map((c) => ({ key: c.key, label: c.label })),
    })),
    answers: current,
  };
}

/**
 * Everything the onboarding wizard and the profile editor edit, shaped as
 * drafts. Returns the raw profile row too so callers can gate on its status.
 */
export async function loadProfileDrafts(userId: string) {
  const supabase = createClient();
  const [
    { data: profile },
    { data: settings },
    { data: prefs },
    { data: photos },
    { data: spotify },
    { data: music },
  ] = await Promise.all([
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

  const [{ data: areas }, { data: school }, { data: shareConsent }] = await Promise.all([
    supabase
      .from("areas")
      .select("slug, name, description")
      .eq("school_id", profile.school_id)
      .order("sort_order"),
    supabase
      .from("schools")
      .select("housing_office_name")
      .eq("id", profile.school_id)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "share_with_housing")
      .is("revoked_at", null)
      .maybeSingle(),
  ]);

  const data: Omit<OnboardingData, "initialStep" | "initialStepId"> = {
    userId,
    profile: {
      firstName: profile.first_name,
      lastName: settings?.last_name ?? "",
      pronouns: profile.pronouns ?? "",
      gender: (profile.gender as OnboardingData["profile"]["gender"]) ?? "",
      classYear: (profile.class_year as OnboardingData["profile"]["classYear"]) ?? "",
      track: (profile.track as OnboardingData["profile"]["track"]) ?? null,
      major: profile.major ?? "",
      bio: profile.bio,
      campus: profile.campus ?? null,
      academicCollege: profile.academic_college ?? null,
      residentialCollege: profile.residential_college ?? null,
      llc: profile.llc ?? null,
      genderInclusive: profile.gender_inclusive ?? null,
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
      weights: {
        ...DEFAULT_IMPORTANCE,
        ...(await loadSchoolDefaultWeights(profile.school_id)),
        ...(prefs.weights as Partial<Record<FactorKey, Importance>>),
      },
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
    sharing: { office: school?.housing_office_name ?? null, granted: Boolean(shareConsent) },
    school: await loadSchoolContext(
      userId,
      profile.school_id,
      Boolean(profile.track_locked),
      Boolean(profile.pre_arrival),
    ),
    dismissedFlags: (
      (
        await supabase
          .from("preference_flags")
          .select("rule_key, answers_sig")
          .eq("user_id", userId)
          .not("dismissed_at", "is", null)
      ).data ?? []
    ).map((f) => ({ ruleKey: f.rule_key, signature: f.answers_sig })),
  };
  return { profile, data };
}
