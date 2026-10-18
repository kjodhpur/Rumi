import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_complete")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: spotify } = await supabase
    .from("spotify_connections")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="px-4 pt-4 font-display text-3xl font-semibold text-asu-maroon">
        Welcome to {APP_NAME}
      </h1>
      <p className="px-4 text-sm text-rumi-muted">
        A few steps now — better roommate matches forever.
      </p>
      <OnboardingWizard
        initialStep={profile?.onboarding_step ?? 0}
        spotifyConnected={Boolean(spotify)}
      />
    </div>
  );
}
