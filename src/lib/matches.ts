import type { ServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MatchCardData } from "@/components/matches/types";
import { photoUrl } from "@/lib/photos";

type FeedRow = Database["public"]["Functions"]["get_match_feed"]["Returns"][number];

export const SORTS = ["best", "newest", "move_in", "budget"] as const;
export type SortKey = (typeof SORTS)[number];
export const PAGE_SIZE = 12;

export interface FeedFilters {
  sort: SortKey;
  q: string;
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  moveFrom: string | null;
  moveTo: string | null;
  genders: string[];
  years: string[];
  saved: boolean;
}

const list = (v: string | string[] | null | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9_-]{1,48}$/.test(s))
    .slice(0, 12);
const int = (v: string | string[] | null | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n) : null;
};
const date = (v: string | string[] | null | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/** Parses (untrusted) URL search params into typed filters. */
export function parseFilters(params: Record<string, string | string[] | undefined> | URLSearchParams): FeedFilters {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) : (params[key] as string | string[] | undefined);
  const sort = get("sort");
  const q = get("q");
  return {
    sort: (SORTS as readonly string[]).includes(String(sort)) ? (sort as SortKey) : "best",
    q: (Array.isArray(q) ? q[0] : (q ?? "")).slice(0, 60),
    budgetMin: int(get("bmin")),
    budgetMax: int(get("bmax")),
    areas: list(get("areas")),
    moveFrom: date(get("from")),
    moveTo: date(get("to")),
    genders: list(get("gender")),
    years: list(get("year")),
    saved: get("view") === "saved",
  };
}

export function filtersToParams(f: FeedFilters) {
  const p = new URLSearchParams();
  if (f.sort !== "best") p.set("sort", f.sort);
  if (f.q) p.set("q", f.q);
  if (f.budgetMin) p.set("bmin", String(f.budgetMin));
  if (f.budgetMax) p.set("bmax", String(f.budgetMax));
  if (f.areas.length) p.set("areas", f.areas.join(","));
  if (f.moveFrom) p.set("from", f.moveFrom);
  if (f.moveTo) p.set("to", f.moveTo);
  if (f.genders.length) p.set("gender", f.genders.join(","));
  if (f.years.length) p.set("year", f.years.join(","));
  if (f.saved) p.set("view", "saved");
  return p;
}

export function activeFilterCount(f: FeedFilters) {
  return (
    (f.budgetMin || f.budgetMax ? 1 : 0) +
    (f.areas.length ? 1 : 0) +
    (f.moveFrom || f.moveTo ? 1 : 0) +
    (f.genders.length ? 1 : 0) +
    (f.years.length ? 1 : 0)
  );
}

const reasonLabels = (value: unknown) =>
  Array.isArray(value) ? value.map((r) => (r as { label?: string }).label).filter((l): l is string => Boolean(l)) : [];

export function mapFeedRow(row: FeedRow, areaNames: Record<string, string>): MatchCardData {
  return {
    id: row.candidate_id,
    firstName: row.first_name,
    lastInitial: row.last_initial,
    classYear: row.class_year,
    major: row.major,
    avatarUrl: photoUrl(row.avatar_path),
    placeholder: row.avatar_placeholder,
    photoCount: row.photo_count,
    verified: row.verified,
    score: row.score,
    reasons: reasonLabels(row.reasons),
    watchouts: reasonLabels(row.watchouts),
    sharedArtists: Array.isArray(row.shared_artists)
      ? (row.shared_artists as { name: string }[]).map((a) => a.name)
      : [],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    moveInDate: row.move_in_date,
    areaNames: (row.areas ?? []).map((slug) => areaNames[slug] ?? slug),
    isSaved: row.is_saved,
    introStatus: (row.intro_status as MatchCardData["introStatus"]) ?? null,
  };
}

export async function fetchFeed(supabase: ServerSupabase, filters: FeedFilters, offset: number, areaNames: Record<string, string>) {
  const { data, error } = await supabase.rpc("get_match_feed", {
    p_sort: filters.sort,
    p_budget_min: filters.budgetMin ?? undefined,
    p_budget_max: filters.budgetMax ?? undefined,
    p_areas: filters.areas.length ? filters.areas : undefined,
    p_move_in_from: filters.moveFrom ?? undefined,
    p_move_in_to: filters.moveTo ?? undefined,
    p_genders: filters.genders.length ? filters.genders : undefined,
    p_years: filters.years.length ? filters.years : undefined,
    p_search: filters.q || undefined,
    p_saved_only: filters.saved,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = data ?? [];
  return {
    items: rows.map((r) => mapFeedRow(r, areaNames)),
    total: rows[0]?.total_count ?? (offset === 0 ? 0 : null),
    nextOffset: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}

export async function loadAreaNames(supabase: ServerSupabase, schoolId?: string) {
  let query = supabase.from("areas").select("slug, name, description, school_id").order("sort_order");
  if (schoolId) query = query.eq("school_id", schoolId);
  const { data } = await query;
  const areas = data ?? [];
  return {
    areas,
    names: Object.fromEntries(areas.map((a) => [a.slug, a.name.split(" — ")[0]])) as Record<string, string>,
  };
}
