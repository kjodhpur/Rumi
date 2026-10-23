import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { loadProfileDrafts } from "@/lib/onboarding-data";

export const metadata: Metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

const STEP_IDS = ["basics", "photos", "about", "housing", "areas", "lifestyle", "habits", "priorities", "dealbreakers", "music"];

export default async function OnboardingPage({ searchParams }: { searchParams: { step?: string } }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  const loaded = await loadProfileDrafts(user.id);
  if (!loaded) redirect("/login");
  const { profile, data } = loaded;
  if (profile.banned_at) redirect("/suspended");
  if (profile.onboarding_completed_at) redirect("/matches");

  const requested = STEP_IDS.indexOf(searchParams.step ?? "");
  return <OnboardingWizard data={{ ...data, initialStep: requested >= 0 ? requested : profile.onboarding_step }} />;
}
