"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { runInBackground } from "@/lib/background";
import { cleanName, cleanText } from "@/lib/sanitize";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import {
  CLASS_YEARS,
  DEALBREAKERS,
  DRINKING,
  FACTORS,
  GENDERS,
  HOUSING_TYPES,
  LEASE_LENGTHS,
  PETS,
  ROOMMATE_GENDERS,
  SMOKING,
  STUDY,
} from "@/lib/options";
import type { Database } from "@/types/database";

const oneOf = <T extends readonly { value: string }[]>(list: T) =>
  z.enum(list.map((i) => i.value) as [T[number]["value"], ...T[number]["value"][]]);
const scale = z.number().int().min(1).max(5);

/**
 * Lenient, per-field schemas for autosave: a half-typed form must never fail
 * the whole save. Invalid fields are skipped; strict checks run on Continue
 * (client) and in complete_onboarding (database).
 */
const profileFields = {
  firstName: z.string().transform(cleanName),
  lastName: z.string().transform((v) => cleanName(v).slice(0, 60)),
  pronouns: z.string().transform((v) => cleanText(v, { multiline: false }).slice(0, 24)),
  gender: oneOf(GENDERS),
  classYear: oneOf(CLASS_YEARS),
  major: z.string().transform((v) => cleanText(v, { multiline: false }).slice(0, 80)),
  bio: z.string().transform((v) => cleanText(v).slice(0, 500)),
} as const;

const prefFields = {
  budgetMin: z.number().int().min(200).max(5000),
  budgetMax: z.number().int().min(200).max(6000),
  areas: z.array(z.string().regex(/^[a-z0-9-]{2,48}$/)).max(12),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  leaseLength: oneOf(LEASE_LENGTHS),
  housingType: oneOf(HOUSING_TYPES),
  genderPref: z.array(oneOf(ROOMMATE_GENDERS)).max(4),
  sleepSchedule: scale,
  cleanliness: scale,
  noise: scale,
  guests: scale,
  smoking: oneOf(SMOKING),
  drinking: oneOf(DRINKING),
  pets: oneOf(PETS),
  study: oneOf(STUDY),
  dealbreakers: z.array(oneOf(DEALBREAKERS)).max(DEALBREAKERS.length),
  weights: z.record(z.enum(FACTORS), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])),
} as const;

export type ProfilePatch = { [K in keyof typeof profileFields]?: z.input<(typeof profileFields)[K]> };
export type PrefsPatch = { [K in keyof typeof prefFields]?: z.input<(typeof prefFields)[K]> };

const PROFILE_COLUMNS = {
  firstName: "first_name",
  pronouns: "pronouns",
  gender: "gender",
  classYear: "class_year",
  major: "major",
  bio: "bio",
} as const;

const PREF_COLUMNS = {
  budgetMin: "budget_min",
  budgetMax: "budget_max",
  areas: "areas",
  moveInDate: "move_in_date",
  leaseLength: "lease_length",
  housingType: "housing_type",
  genderPref: "gender_pref",
  sleepSchedule: "sleep_schedule",
  cleanliness: "cleanliness",
  noise: "noise",
  guests: "guests",
  smoking: "smoking",
  drinking: "drinking",
  pets: "pets",
  study: "study",
  dealbreakers: "dealbreakers",
  weights: "weights",
} as const;

function pick<S extends Record<string, z.ZodTypeAny>>(schemas: S, input: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  if (!input) return out;
  for (const [key, value] of Object.entries(input)) {
    const schema = schemas[key];
    if (!schema || value === undefined) continue;
    const parsed = schema.safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}

export async function saveProfileAndPrefs(input: {
  profile?: ProfilePatch;
  prefs?: PrefsPatch;
  step?: number;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const supabase = createClient();

  const profile = pick(profileFields, input.profile);
  const prefs = pick(prefFields, input.prefs);

  const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {};
  for (const [key, column] of Object.entries(PROFILE_COLUMNS)) {
    if (key in profile) (profileUpdate as Record<string, unknown>)[column] = profile[key];
  }
  if (typeof profile.lastName === "string") {
    profileUpdate.last_initial = (profile.lastName as string).charAt(0).toUpperCase();
  }
  if (typeof input.step === "number" && input.step >= 0 && input.step <= 20) {
    profileUpdate.onboarding_step = input.step;
  }

  const prefsUpdate: Database["public"]["Tables"]["preferences"]["Update"] = {};
  for (const [key, column] of Object.entries(PREF_COLUMNS)) {
    if (key in prefs) (prefsUpdate as Record<string, unknown>)[column] = prefs[key];
  }
  // Keep the range valid even when only one end changed.
  if (
    typeof prefsUpdate.budget_min === "number" &&
    typeof prefsUpdate.budget_max === "number" &&
    prefsUpdate.budget_min > prefsUpdate.budget_max
  ) {
    prefsUpdate.budget_max = prefsUpdate.budget_min;
  }

  const writes = [];
  if (Object.keys(profileUpdate).length > 0) {
    writes.push(supabase.from("profiles").update(profileUpdate).eq("id", user.id));
  }
  if (typeof profile.lastName === "string") {
    writes.push(supabase.from("user_settings").update({ last_name: profile.lastName as string }).eq("user_id", user.id));
  }
  if (Object.keys(prefsUpdate).length > 0) {
    writes.push(supabase.from("preferences").update(prefsUpdate).eq("user_id", user.id));
  }
  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[onboarding] save failed", failed.error);
    return fail("Couldn't save just now — we'll retry.");
  }
  return ok();
}

/** Settings edits: save, then refresh everyone's scores with this person in the background. */
export async function savePreferences(input: { profile?: ProfilePatch; prefs?: PrefsPatch }): Promise<ActionResult> {
  const result = await saveProfileAndPrefs(input);
  if (!result.ok) return result;
  const user = await getUser();
  if (user && input.prefs && Object.keys(input.prefs).length > 0) {
    runInBackground("recompute", () => recomputeMatchesFor(user.id));
  }
  revalidatePath("/matches");
  return result;
}

export async function completeOnboarding(): Promise<ActionResult<{ matches: number }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const supabase = createClient();
  const { error } = await supabase.rpc("complete_onboarding");
  if (error) return fail(friendlyDbError(error.message));
  try {
    // No revalidatePath here: re-rendering /onboarding now would redirect away
    // from the finish screen. The client navigates to /matches when ready.
    const { matches } = await recomputeMatchesFor(user.id);
    return ok({ matches });
  } catch (err) {
    console.error("[onboarding] recompute failed", err);
    // Profile is complete; the repair cron will compute scores shortly.
    return ok({ matches: 0 });
  }
}
