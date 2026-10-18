import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/matches/match-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CAMPUSES, MOVE_IN_TERMS, PREFERRED_AREAS, YEARS } from "@/lib/constants";
import type { MatchBreakdown } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";
import { MatchesFilters } from "@/components/matches/matches-filters";

export const metadata = { title: "Matches" };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await trackEvent("matches_viewed", user?.id);

  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "match";
  const minScore = Number(searchParams.minScore ?? 0) || 0;
  const campus = typeof searchParams.campus === "string" ? searchParams.campus : "";
  const year = typeof searchParams.year === "string" ? searchParams.year : "";
  const moveIn = typeof searchParams.moveIn === "string" ? searchParams.moveIn : "";
  const placeStatus =
    typeof searchParams.placeStatus === "string" ? searchParams.placeStatus : "";
  const area = typeof searchParams.area === "string" ? searchParams.area : "";
  const spotifyOnly = searchParams.spotifyOnly === "1";
  const budgetMaxFilter = Number(searchParams.budgetMax ?? 0) || 0;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const pageSize = 12;

  let cacheQuery = supabase
    .from("match_cache")
    .select("other_id, score, breakdown")
    .eq("user_id", user!.id)
    .gte("score", minScore);

  if (sort === "match") cacheQuery = cacheQuery.order("score", { ascending: false });
  else cacheQuery = cacheQuery.order("computed_at", { ascending: false });

  const { data: cache } = await cacheQuery;

  const otherIds = (cache ?? []).map((c) => c.other_id);
  if (!otherIds.length) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">Your matches</h1>
        <EmptyState
          title="No matches yet"
          description="Finish onboarding, or wait for the match cache to refresh. Seed profiles help demos — run npm run seed after setting up Supabase."
        />
      </div>
    );
  }

  const [{ data: profiles }, { data: housing }, { data: spotifyConn }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", otherIds),
    supabase.from("housing_prefs").select("*").in("user_id", otherIds),
    supabase.from("spotify_connections").select("user_id").in("user_id", otherIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const housingMap = new Map((housing ?? []).map((h) => [h.user_id, h]));
  const spotifySet = new Set((spotifyConn ?? []).map((s) => s.user_id));

  let rows = (cache ?? [])
    .map((c) => {
      const p = profileMap.get(c.other_id);
      const h = housingMap.get(c.other_id);
      if (!p || !h) return null;
      return {
        cache: c,
        profile: p,
        housing: h,
        breakdown: c.breakdown as MatchBreakdown,
      };
    })
    .filter(Boolean) as Array<{
    cache: { other_id: string; score: number; breakdown: unknown };
    profile: NonNullable<typeof profiles>[number];
    housing: NonNullable<typeof housing>[number];
    breakdown: MatchBreakdown;
  }>;

  if (campus) rows = rows.filter((r) => r.profile.campus === campus);
  if (year) rows = rows.filter((r) => r.profile.year === year);
  if (moveIn) rows = rows.filter((r) => r.housing.move_in_term === moveIn);
  if (placeStatus) rows = rows.filter((r) => r.housing.place_status === placeStatus);
  if (area) rows = rows.filter((r) => r.housing.preferred_areas?.includes(area));
  if (spotifyOnly) rows = rows.filter((r) => spotifySet.has(r.profile.id));
  if (budgetMaxFilter) {
    rows = rows.filter((r) => r.housing.budget_min <= budgetMaxFilter);
  }

  if (sort === "budget") {
    rows = [...rows].sort((a, b) => a.housing.budget_min - b.housing.budget_min);
  } else if (sort === "newest") {
    rows = [...rows].sort(
      (a, b) =>
        new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime(),
    );
  }

  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside>
        <h1 className="mb-4 font-display text-3xl font-black tracking-brand text-asu-maroon lg:hidden">
          Matches
        </h1>
        <MatchesFilters
          campuses={[...CAMPUSES]}
          years={[...YEARS]}
          moveIns={[...MOVE_IN_TERMS]}
          areas={[...PREFERRED_AREAS]}
          current={{
            sort,
            minScore: String(minScore || ""),
            campus,
            year,
            moveIn,
            placeStatus,
            area,
            spotifyOnly,
            budgetMax: budgetMaxFilter ? String(budgetMaxFilter) : "",
          }}
        />
      </aside>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h1 className="hidden font-display text-3xl font-black tracking-brand text-asu-maroon lg:block">
            Your matches
          </h1>
          <p className="text-sm text-rumi-muted">{total} people</p>
        </div>
        {pageRows.length === 0 ? (
          <EmptyState
            title="No matches for these filters"
            description="Try lowering the minimum match % or clearing filters."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((r) => (
              <MatchCard
                key={r.profile.id}
                id={r.profile.id}
                firstName={r.profile.first_name}
                lastInitial={r.profile.last_initial}
                photoUrl={r.profile.photo_url}
                year={r.profile.year ?? ""}
                major={r.profile.major ?? ""}
                budgetMin={r.housing.budget_min}
                budgetMax={r.housing.budget_max}
                areas={r.housing.preferred_areas ?? []}
                moveIn={r.housing.move_in_term}
                score={Number(r.cache.score)}
                inCommon={r.breakdown?.inCommon ?? []}
                sharedArtists={(r.breakdown?.sharedArtists ?? []).map((a) => a.name)}
              />
            ))}
          </div>
        )}
        {total > pageSize ? (
          <div className="flex justify-center gap-3 pt-4">
            {page > 1 ? (
              <a
                className="text-sm font-semibold text-asu-maroon"
                href={`?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(searchParams).map(([k, v]) => [
                      k,
                      Array.isArray(v) ? v[0] ?? "" : v ?? "",
                    ]),
                  ),
                  page: String(page - 1),
                }).toString()}`}
              >
                Previous
              </a>
            ) : null}
            {page * pageSize < total ? (
              <a
                className="text-sm font-semibold text-asu-maroon"
                href={`?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(searchParams).map(([k, v]) => [
                      k,
                      Array.isArray(v) ? v[0] ?? "" : v ?? "",
                    ]),
                  ),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
