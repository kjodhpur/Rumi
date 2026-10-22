import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { fetchFeed, filtersToParams, loadAreaNames, parseFilters } from "@/lib/matches";
import { MatchesView } from "@/components/matches/matches-view";
import { GroupsForYou } from "@/components/groups/groups-for-you";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = { title: "Matches" };
export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getUser();
  const supabase = createClient();
  const filters = parseFilters(searchParams);

  const { data: me } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const { areas, names } = await loadAreaNames(supabase, me?.school_id);

  let initial;
  try {
    initial = await fetchFeed(supabase, filters, 0, names);
  } catch (error) {
    console.error("[matches] feed failed", error);
    return <ErrorState title="We couldn't load your matches" description="Check your connection and try again." retryHref="/matches" />;
  }

  return (
    <MatchesView
      key={filtersToParams(filters).toString()}
      initial={initial}
      filters={filters}
      areas={areas.map((a) => ({ slug: a.slug, name: a.name }))}
    >
      <GroupsForYou />
    </MatchesView>
  );
}
