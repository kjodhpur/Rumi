import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayName, formatBudget, instagramUrl } from "@/lib/utils";
import { ProfileActions } from "@/components/profile/profile-actions";
import type { MatchBreakdown } from "@/lib/types";
import { LIFESTYLE_LABELS } from "@/lib/constants";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_initial")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return { title: "Profile" };
  return { title: displayName(data.first_name, data.last_initial) };
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile || !profile.onboarding_complete || profile.paused || profile.suspended) {
    notFound();
  }

  const [{ data: housing }, { data: lifestyle }, { data: artists }, { data: genres }, { data: match }, { data: saved }] =
    await Promise.all([
      supabase.from("housing_prefs").select("*").eq("user_id", params.id).maybeSingle(),
      supabase.from("lifestyle_prefs").select("*").eq("user_id", params.id).maybeSingle(),
      supabase
        .from("spotify_top_artists")
        .select("*")
        .eq("user_id", params.id)
        .order("rank")
        .limit(5),
      supabase
        .from("spotify_genres")
        .select("*")
        .eq("user_id", params.id)
        .order("count", { ascending: false })
        .limit(8),
      supabase
        .from("match_cache")
        .select("*")
        .eq("user_id", user!.id)
        .eq("other_id", params.id)
        .maybeSingle(),
      supabase
        .from("saved_profiles")
        .select("saved_id")
        .eq("user_id", user!.id)
        .eq("saved_id", params.id)
        .maybeSingle(),
    ]);

  const breakdown = (match?.breakdown ?? null) as MatchBreakdown | null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="overflow-hidden rounded-2xl border border-rumi-sand bg-white">
        <div className="aspect-[21/9] bg-rumi-sand">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold text-asu-maroon">
                {displayName(profile.first_name, profile.last_initial)}
              </h1>
              <p className="text-rumi-muted">
                {profile.year} · {profile.major} · {profile.campus}
                {profile.pronouns ? ` · ${profile.pronouns}` : ""}
                {profile.show_gender_publicly && profile.own_gender
                  ? ` · ${profile.own_gender}`
                  : ""}
              </p>
            </div>
            {match ? (
              <span className="rounded-xl bg-asu-gold px-3 py-2 font-display text-2xl font-bold text-asu-maroon">
                {Math.round(Number(match.score))}%
              </span>
            ) : null}
          </div>
          <p className="text-rumi-ink">{profile.bio}</p>
          {profile.instagram ? (
            <a
              href={instagramUrl(profile.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-asu-maroon underline"
            >
              @{profile.instagram.replace(/^@/, "")}
            </a>
          ) : null}
          {housing ? (
            <p className="text-sm text-rumi-muted">
              {formatBudget(housing.budget_min, housing.budget_max)} · {housing.move_in_term} ·{" "}
              {(housing.preferred_areas ?? []).join(", ")} ·{" "}
              {housing.place_status === "has-place" ? "Has a place" : "Needs a place"}
            </p>
          ) : null}

          {params.id !== user!.id ? (
            <ProfileActions profileId={params.id} initiallySaved={Boolean(saved)} />
          ) : null}
        </div>
      </div>

      {breakdown ? (
        <section className="space-y-4 rounded-2xl border border-rumi-sand bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-asu-maroon">
            Compatibility breakdown
          </h2>
          <p className="text-sm text-rumi-muted">
            Lifestyle {breakdown.lifestyleScore}%
            {breakdown.musicScore !== null ? ` · Music ${breakdown.musicScore}%` : ""}
            {breakdown.campusBonus ? " · Same campus +3" : ""}
            {breakdown.yearBonus ? " · Same year +2" : ""}
          </p>
          <div className="space-y-3">
            {breakdown.categoryScores.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="text-rumi-muted">
                    You {c.yours} · Them {c.theirs}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-rumi-sand">
                  <div
                    className="h-full rounded-full bg-asu-maroon"
                    style={{ width: `${c.similarity * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {breakdown.frictionPoints.length ? (
            <div>
              <h3 className="text-sm font-semibold">Potential friction</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-rumi-muted">
                {breakdown.frictionPoints.map((f) => (
                  <li key={f.category}>
                    {f.category}: you {f.yours} vs them {f.theirs}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {breakdown.sharedArtists.length ? (
            <p className="text-sm text-rumi-muted">
              Shared artists: {breakdown.sharedArtists.map((a) => a.name).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {(artists?.length || genres?.length) ? (
        <section className="space-y-3 rounded-2xl border border-rumi-sand bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-asu-maroon">Music taste</h2>
          <div className="flex flex-wrap gap-3">
            {(artists ?? []).map((a) => (
              <div key={a.artist_id} className="flex items-center gap-2">
                {a.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : null}
                <span className="text-sm">{a.name}</span>
              </div>
            ))}
          </div>
          {(genres ?? []).length ? (
            <p className="text-sm text-rumi-muted">
              Top genres: {(genres ?? []).map((g) => g.genre).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {lifestyle ? (
        <section className="rounded-2xl border border-rumi-sand bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-asu-maroon">Lifestyle</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(LIFESTYLE_LABELS).map(([key, label]) => (
              <li key={key} className="text-sm">
                <span className="text-rumi-muted">{label}:</span>{" "}
                {String(lifestyle[key as keyof typeof lifestyle] ?? "")}/5
              </li>
            ))}
            <li className="text-sm">
              <span className="text-rumi-muted">Smoking:</span> {lifestyle.smoking}
            </li>
            <li className="text-sm">
              <span className="text-rumi-muted">Drinking:</span> {lifestyle.drinking}
            </li>
            <li className="text-sm">
              <span className="text-rumi-muted">Pets:</span> {lifestyle.pets}
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
