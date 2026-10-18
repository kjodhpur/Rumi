"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  basicsSchema,
  dealbreakersSchema,
  housingSchema,
  lifestyleSchema,
  weightsSchema,
} from "@/lib/validations";
import { recomputeMatchCache } from "@/lib/matches-service";
import { trackEvent } from "@/lib/analytics";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function saveBasics(input: unknown) {
  const data = basicsSchema.parse(input);
  const { supabase, user } = await requireUser();
  const instagram =
    data.instagram && data.instagram.length > 0
      ? data.instagram.replace(/^@/, "")
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_initial: data.last_initial.toUpperCase(),
      photo_url: data.photo_url ?? null,
      pronouns: data.pronouns || null,
      year: data.year,
      major: data.major,
      campus: data.campus,
      bio: data.bio,
      instagram,
      own_gender: data.own_gender,
      show_gender_publicly: data.show_gender_publicly,
      onboarding_step: Math.max(1, 1),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
  revalidatePath("/me");
  return { ok: true };
}

export async function saveHousing(input: unknown) {
  const data = housingSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("housing_prefs").upsert({
    user_id: user.id,
    ...data,
  });
  if (error) throw new Error(error.message);
  await supabase.from("profiles").update({ onboarding_step: 2 }).eq("id", user.id);
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function saveLifestyle(input: unknown) {
  const data = lifestyleSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("lifestyle_prefs").upsert({
    user_id: user.id,
    ...data,
  });
  if (error) throw new Error(error.message);
  await supabase.from("profiles").update({ onboarding_step: 3 }).eq("id", user.id);
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function saveDealbreakers(input: unknown) {
  const data = dealbreakersSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("lifestyle_prefs")
    .update({ dealbreakers: data.dealbreakers })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("profiles").update({ onboarding_step: 4 }).eq("id", user.id);
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function saveWeights(input: unknown) {
  const data = weightsSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("lifestyle_prefs")
    .update({ weights: data.weights })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.from("profiles").update({ onboarding_step: 5 }).eq("id", user.id);
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function completeOnboarding() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true, onboarding_step: 6 })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  await trackEvent("onboarding_complete", user.id);
  try {
    await recomputeMatchCache(user.id);
  } catch {
    // Cache can be filled by cron if service role not ready locally
  }
  revalidatePath("/matches");
  return { ok: true };
}

export async function setPaused(paused: boolean) {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ paused }).eq("id", user.id);
  revalidatePath("/me");
  revalidatePath("/matches");
  return { ok: true };
}

export async function deleteAccount() {
  const { user } = await requireUser();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);
  return { ok: true };
}
