import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayName, formatBudget, instagramUrl } from "@/lib/utils";
import { ProfileActions } from "@/components/profile/profile-actions";
import { HowConnected } from "@/components/profile/how-connected";
import { loadMutualSummary } from "@/lib/mutuals-server";
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

  const [
    { data: housing },
    { data: lifestyle },
    { data: artists },
    { data: genres },
    { data: match },
    { data: saved },
    { data: photos },
    { data: introRow },
    { data: socialLinks },
  ] = await Promise.all([
    supabase.from("housing_prefs").select("*").eq("user_id", params.id).maybeSingle(),
    supabase.from("lifestyle_prefs").select("*").eq("user_id", params.id).maybeSingle(),
    supabase.from("spotify_top_artists").select("*").eq("user_id", params.id).order("rank").limit(5),
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
    supabase
      .from("profile_photos")
      .select("*")
      .eq("user_id", params.id)
      .order("sort_order"),
    supabase
      .from("intros")
      .select("id, status, from_user_id, to_user_id")
      .or(
        `and(from_user_id.eq.${user!.id},to_user_id.eq.${params.id}),and(from_user_id.eq.${params.id},to_user_id.eq.${user!.id})`,
      )
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("social_links").select("*").eq("user_id", params.id),
  ]);

  const breakdown = (match?.breakdown ?? null) as MatchBreakdown | null;
  const primaryPhoto =
    photos?.[0]?.storage_path ?? profile.photo_url ?? null;

  let introStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "declined" =
    "none";
  let conversationId: string | null = null;
  if (introRow) {
    if (introRow.status === "accepted") {
      introStatus = "accepted";
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("intro_id", introRow.id)
        .maybeSingle();
      conversationId = conv?.id ?? null;
    } else if (introRow.status === "pending") {
      introStatus =
        introRow.from_user_id === user!.id ? "pending_sent" : "pending_received";
    }
  }

  const mutuals =
    params.id !== user!.id
      ? await loadMutualSummary(supabase, user!.id, params.id)
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-elevation1">
        <div className="aspect-[21/9] bg-bg-muted">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        {(photos ?? []).length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
            {photos!.map((ph) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={ph.id}
                src={ph.storage_path}
                alt=""
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
            ))}
          </div>
        ) : null}
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">
                {displayName(profile.first_name, profile.last_initial)}
              </h1>
              <p className="text-ink-muted">
                {profile.year} · {profile.major} · {profile.campus}
                {profile.pronouns ? ` · ${profile.pronouns}` : ""}
              </p>
            </div>
            {match ? (
              <span className="font-ui rounded-md bg-accent-soft px-3 py-2 text-2xl font-bold tabular-nums text-accent">
                {Math.round(Number(match.score))}%
              </span>
            ) : null}
          </div>
          <p className="text-ink">{profile.bio}</p>
          {profile.show_social_links !== false && (socialLinks?.length || profile.instagram) ? (
            <div className="flex flex-wrap gap-3 text-sm">
              {(socialLinks ?? []).map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline"
                >
                  {l.provider}: @{l.handle}
                </a>
              ))}
              {!socialLinks?.length && profile.instagram ? (
                <a
                  href={instagramUrl(profile.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline"
                >
                  @{profile.instagram.replace(/^@/, "")}
                </a>
              ) : null}
            </div>
          ) : null}
          {housing ? (
            <p className="text-sm text-ink-muted">
              {formatBudget(housing.budget_min, housing.budget_max)} · {housing.move_in_term} ·{" "}
              {(housing.preferred_areas ?? []).join(", ")} ·{" "}
              {housing.place_status === "has-place" ? "Has a place" : "Needs a place"}
            </p>
          ) : null}

          {params.id !== user!.id ? (
            <ProfileActions
              profileId={params.id}
              initiallySaved={Boolean(saved)}
              introStatus={introStatus}
              conversationId={conversationId}
            />
          ) : null}
        </div>
      </div>

      {mutuals && params.id !== user!.id ? <HowConnected summary={mutuals} /> : null}

      {breakdown ? (
        <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-6 shadow-elevation1">
          <h2 className="font-ui text-xl font-semibold text-ink">Compatibility breakdown</h2>
          {(breakdown.topReasons ?? breakdown.inCommon)?.length ? (
            <div className="flex flex-wrap gap-2">
              {(breakdown.topReasons ?? breakdown.inCommon).slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="font-ui rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-ink-muted">
            Lifestyle {breakdown.lifestyleScore}%
            {breakdown.musicScore !== null ? ` · Music ${breakdown.musicScore}%` : ""}
            {breakdown.campusBonus ? " · Same campus +3" : ""}
            {breakdown.yearBonus ? " · Same year +2" : ""}
            {breakdown.mutualBonus ? ` · Mutuals +${breakdown.mutualBonus}` : ""}
          </p>
          <div className="space-y-3">
            {breakdown.categoryScores.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="text-ink-muted">
                    You {c.yours} · Them {c.theirs}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${c.similarity * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {breakdown.frictionPoints.length ? (
            <div>
              <h3 className="font-ui text-sm font-semibold">Potential friction</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
                {breakdown.frictionPoints.map((f) => (
                  <li key={f.category}>
                    {f.category}: you {f.yours} vs them {f.theirs}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {breakdown.sharedArtists.length ? (
            <p className="text-sm text-ink-muted">
              Shared artists: {breakdown.sharedArtists.map((a) => a.name).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {artists?.length || genres?.length ? (
        <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-6 shadow-elevation1">
          <h2 className="font-ui text-xl font-semibold text-ink">Music taste</h2>
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
            <p className="text-sm text-ink-muted">
              Top genres: {(genres ?? []).map((g) => g.genre).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {lifestyle ? (
        <section className="rounded-lg border border-border bg-bg-elevated p-6 shadow-elevation1">
          <h2 className="font-ui text-xl font-semibold text-ink">Lifestyle</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(LIFESTYLE_LABELS).map(([key, label]) => (
              <li key={key} className="text-sm">
                <span className="text-ink-muted">{label}:</span>{" "}
                {String(lifestyle[key as keyof typeof lifestyle] ?? "")}/5
              </li>
            ))}
            <li className="text-sm">
              <span className="text-ink-muted">Smoking:</span> {lifestyle.smoking}
            </li>
            <li className="text-sm">
              <span className="text-ink-muted">Drinking:</span> {lifestyle.drinking}
            </li>
            <li className="text-sm">
              <span className="text-ink-muted">Pets:</span> {lifestyle.pets}
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
