import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { MeControls } from "@/components/profile/me-controls";
import { displayName } from "@/lib/utils";

export const metadata = { title: "My profile" };

export default async function MePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: housing }, { data: lifestyle }, { data: spotify }, { data: artists }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      supabase.from("housing_prefs").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("lifestyle_prefs").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("spotify_connections").select("connected_at, last_synced_at").eq("user_id", user!.id).maybeSingle(),
      supabase
        .from("spotify_top_artists")
        .select("name, rank")
        .eq("user_id", user!.id)
        .order("rank")
        .limit(5),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">
          {profile
            ? displayName(profile.first_name, profile.last_initial)
            : "Your profile"}
        </h1>
        <p className="text-sm text-rumi-muted">{user?.email}</p>
      </div>

      <section className="space-y-2 rounded-2xl border border-rumi-sand bg-white p-5">
        <h2 className="font-display text-xl text-asu-maroon">Basics</h2>
        <p className="text-sm">
          {profile?.year} · {profile?.major} · {profile?.campus}
        </p>
        <p className="text-sm text-rumi-muted">{profile?.bio}</p>
        <Link href="/onboarding" className="text-sm font-semibold text-asu-maroon underline">
          Edit via onboarding wizard
        </Link>
      </section>

      <section className="space-y-2 rounded-2xl border border-rumi-sand bg-white p-5">
        <h2 className="font-display text-xl text-asu-maroon">Housing</h2>
        {housing ? (
          <p className="text-sm text-rumi-muted">
            ${housing.budget_min}–${housing.budget_max} · {housing.move_in_term} ·{" "}
            {(housing.preferred_areas ?? []).join(", ")}
          </p>
        ) : (
          <p className="text-sm text-rumi-muted">Not set</p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-rumi-sand bg-white p-5">
        <h2 className="font-display text-xl text-asu-maroon">Spotify</h2>
        {spotify ? (
          <div className="space-y-2 text-sm">
            <p className="text-green-800">Connected</p>
            <p className="text-rumi-muted">
              Top artists: {(artists ?? []).map((a) => a.name).join(", ") || "—"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-rumi-muted">Not connected</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {!spotify ? (
            <a
              href="/api/spotify/login"
              className="inline-flex h-10 items-center rounded-xl bg-asu-gold px-4 text-sm font-semibold text-asu-maroon"
            >
              Connect Spotify
            </a>
          ) : null}
        </div>
      </section>

      <MeControls
        paused={Boolean(profile?.paused)}
        spotifyConnected={Boolean(spotify)}
      />

      <form action={signOut}>
        <button type="submit" className="text-sm font-semibold text-rumi-muted underline">
          Sign out
        </button>
      </form>

      {/* lifestyle unused visually but ensures fetch for completeness */}
      {lifestyle ? null : null}
    </div>
  );
}
