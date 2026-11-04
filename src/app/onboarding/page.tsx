import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { loadProfileDrafts } from "@/lib/onboarding-data";
import { WithI18n } from "@/components/providers/with-i18n";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("onboarding"))("title") };
}
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  const loaded = await loadProfileDrafts(user.id);
  if (!loaded) redirect("/login");
  const { profile, data } = loaded;
  if (profile.banned_at) redirect("/suspended");
  if (profile.is_staff) redirect("/staff");
  if (profile.sso_non_student) redirect("/not-a-student");
  if (profile.onboarding_completed_at) redirect("/matches");

  return (
    <WithI18n>
      <OnboardingWizard
        data={{
          ...data,
          initialStep: profile.onboarding_step,
          initialStepId: searchParams.step?.slice(0, 40) ?? null,
        }}
      />
    </WithI18n>
  );
}
