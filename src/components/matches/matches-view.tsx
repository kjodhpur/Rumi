"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowDownUp,
  Bookmark,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CountBubble } from "@/components/ui/badge";
import { useProfileOverlay } from "@/components/profile/profile-overlay";
import { toggleSave } from "@/app/actions/social";
import { CLASS_YEARS, ROOMMATE_GENDERS, labelOf } from "@/lib/options";
import {
  activeFilterCount,
  filtersToParams,
  PAGE_SIZE,
  type FeedFilters,
  type SortKey,
} from "@/lib/matches";
import { cn, formatMoney } from "@/lib/utils";
import { revealDelay } from "@/lib/motion";
import { HydrateOnView } from "@/components/ui/hydrate-on-view";
import { useEntrance } from "@/hooks/use-entrance";
import { whenIdle } from "@/lib/idle";
import { MatchCard } from "./match-card";
import type { MatchCardData } from "./types";

const SORT_LABELS: Record<SortKey, string> = {
  best: "Best match",
  newest: "Newest",
  move_in: "Soonest move-in",
  budget: "Lowest budget",
};

interface MatchesViewProps {
  initial: { items: MatchCardData[]; total: number | null; nextOffset: number | null };
  filters: FeedFilters;
  areas: { slug: string; name: string }[];
  children?: React.ReactNode;
}

const loadFiltersSheet = () => import("./filters-sheet").then((m) => m.FiltersSheet);
const FiltersSheet = dynamic(loadFiltersSheet, { ssr: false });

export function MatchesView({ initial, filters, areas, children }: MatchesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const overlay = useProfileOverlay();
  const [items, setItems] = React.useState(initial.items);
  const entrance = useEntrance(initial.items.map((item) => item.id));
  const [nextOffset, setNextOffset] = React.useState(initial.nextOffset);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  // Mounted on first use (then kept, so it can animate closed); the chunk is prefetched when idle.
  const [filtersUsed, setFiltersUsed] = React.useState(false);
  React.useEffect(() => whenIdle(() => void loadFiltersSheet(), 3000), []);
  React.useEffect(() => {
    if (filtersOpen) setFiltersUsed(true);
  }, [filtersOpen]);
  const [search, setSearch] = React.useState(filters.q);
  const [pending, startTransition] = React.useTransition();
  const sentinel = React.useRef<HTMLDivElement>(null);

  const total = initial.total ?? items.length;
  const filterCount = activeFilterCount(filters);

  const navigate = React.useCallback(
    (next: FeedFilters) => {
      const qs = filtersToParams(next).toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router],
  );

  // Debounced search.
  React.useEffect(() => {
    if (search === filters.q) return;
    const t = setTimeout(() => navigate({ ...filters, q: search.trim() }), 300);
    return () => clearTimeout(t);
  }, [search, filters, navigate]);

  // Keep cards in sync with saves/blocks made inside the profile overlay.
  React.useEffect(() => {
    if (!overlay) return;
    return overlay.subscribe((event) => {
      if (event.type === "removed") setItems((list) => list.filter((m) => m.id !== event.id));
      if (event.type === "saved") {
        setItems((list) =>
          filters.saved && !event.saved
            ? list.filter((m) => m.id !== event.id)
            : list.map((m) => (m.id === event.id ? { ...m, isSaved: event.saved } : m)),
        );
      }
    });
  }, [overlay, filters.saved]);

  const loadMore = React.useCallback(async () => {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const params = filtersToParams(filters);
      params.set("offset", String(nextOffset));
      const res = await fetch(`/api/matches?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as { items: MatchCardData[]; nextOffset: number | null };
      setItems((list) => {
        const seen = new Set(list.map((m) => m.id));
        return [...list, ...page.items.filter((m) => !seen.has(m.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [filters, nextOffset, loadingMore]);

  // Infinite scroll: start fetching well before the end comes into view.
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || nextOffset === null || loadError) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadMore(),
      {
        rootMargin: "800px 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextOffset, loadError]);

  async function onToggleSave(card: MatchCardData) {
    const saved = !card.isSaved;
    setItems((list) =>
      filters.saved && !saved
        ? list.filter((m) => m.id !== card.id)
        : list.map((m) => (m.id === card.id ? { ...m, isSaved: saved } : m)),
    );
    const result = await toggleSave(card.id, saved);
    if (!result.ok) {
      toast.error(result.error);
      setItems((list) =>
        list.some((m) => m.id === card.id)
          ? list.map((m) => (m.id === card.id ? card : m))
          : [card, ...list],
      );
    }
  }

  const chips = filterChips(filters, areas);

  const renderCard = (card: MatchCardData, index: number) => (
    <MatchCard
      data={card}
      priority={index < 2}
      onOpen={overlay ? (data) => overlay.open(data) : undefined}
      onToggleSave={(data) => void onToggleSave(data)}
    />
  );

  return (
    <div>
      <PageHeader
        title={filters.saved ? "Saved" : "Your matches"}
        description={
          filters.saved
            ? "People you've bookmarked to come back to."
            : total > 0
              ? `${total} ${total === 1 ? "person fits" : "people fit"} how you live — best first.`
              : "Ranked by how well you'd actually live together."
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl
          aria-label="View"
          className="md:w-[240px]"
          value={filters.saved ? "saved" : "all"}
          onValueChange={(v) => navigate({ ...filters, saved: v === "saved" })}
          options={[
            {
              value: "all",
              label: (
                <>
                  <Sparkles className="size-4" strokeWidth={1.75} aria-hidden /> For you
                </>
              ),
            },
            {
              value: "saved",
              label: (
                <>
                  <Bookmark className="size-4" strokeWidth={1.75} aria-hidden /> Saved
                </>
              ),
            },
          ]}
        />
        <div className="flex items-center gap-2">
          <Input
            type="search"
            aria-label="Search matches by name, major or bio"
            placeholder="Search name, major…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leading={<Search strokeWidth={1.75} />}
            trailing={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-hover hover:text-ink"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              ) : null
            }
            className="min-w-0 flex-1 md:w-[260px] md:flex-none"
          />
          <label className="relative">
            <span className="sr-only">Sort by</span>
            <select
              value={filters.sort}
              onChange={(e) => navigate({ ...filters, sort: e.target.value as SortKey })}
              className="h-11 appearance-none rounded-md bg-surface pr-3 pl-10 text-body-sm font-medium text-ink shadow-xs ring-1 ring-line-strong outline-none ring-inset focus-visible:ring-2 focus-visible:ring-focus max-sm:w-11 max-sm:pr-0 max-sm:text-transparent"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key} className="text-ink">
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
            <ArrowDownUp
              className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-2"
              strokeWidth={1.75}
              aria-hidden
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
            className="h-11 shrink-0 max-sm:w-11 max-sm:px-0"
            aria-label={filterCount ? `Filters, ${filterCount} active` : "Filters"}
          >
            <SlidersHorizontal strokeWidth={1.75} />
            <span className="max-sm:hidden">Filters</span>
            {filterCount > 0 ? (
              <CountBubble
                count={filterCount}
                className="max-sm:absolute max-sm:-top-1 max-sm:-right-1"
              />
            ) : null}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="-mx-4 mb-5 scrollbar-none flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
          >
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => navigate(chip.remove(filters))}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-ink pr-2 pl-3 text-body-sm font-medium text-ink-inverse transition-transform active:scale-95"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label}
                <X className="size-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!filters.saved && !filters.q && filterCount === 0 ? children : null}

      <div
        className={cn("transition-opacity duration-200", pending && "opacity-50")}
        aria-busy={pending || undefined}
      >
        {items.length === 0 ? (
          <Empty
            filters={filters}
            filterCount={filterCount}
            onClear={() =>
              navigate({
                ...filters,
                budgetMin: null,
                budgetMax: null,
                areas: [],
                moveFrom: null,
                moveTo: null,
                genders: [],
                years: [],
                q: "",
              })
            }
          />
        ) : (
          <>
            <h2 className="sr-only">{filters.saved ? "Saved profiles" : "Ranked matches"}</h2>
            <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((card, index) => (
                <li key={card.id} className={entrance(card.id)} style={revealDelay(index, PAGE_SIZE)}>
                  {index < 3 ? (
                    renderCard(card, index)
                  ) : (
                    // Below the first screen: the HTML is already there; it hydrates as it approaches.
                    <HydrateOnView margin="600px">{renderCard(card, index)}</HydrateOnView>
                  )}
                </li>
              ))}
              {loadingMore
                ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={`s${i}`} />)
                : null}
            </ul>
          </>
        )}
        <div ref={sentinel} aria-hidden className="h-px" />
        {loadError ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-body-sm text-ink-2">Couldn&apos;t load more matches.</p>
            <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
              Try again
            </Button>
          </div>
        ) : null}
        {nextOffset === null && items.length > 6 ? (
          <p className="mt-12 text-center text-body-sm text-ink-3">
            That&apos;s everyone for now. New matches show up as people join.
          </p>
        ) : null}
      </div>

      {filtersUsed || filtersOpen ? (
        <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} filters={filters} areas={areas} onApply={navigate} />
      ) : null}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <li aria-hidden>
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <div className="flex flex-col gap-2 px-1 pt-3.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-1 h-4 w-4/5" />
      </div>
    </li>
  );
}

function Empty({
  filters,
  filterCount,
  onClear,
}: {
  filters: FeedFilters;
  filterCount: number;
  onClear: () => void;
}) {
  if (filters.saved) {
    return (
      <EmptyState
        icon={<Bookmark strokeWidth={1.5} />}
        title="Nothing saved yet"
        description="Tap the bookmark on anyone you'd like to come back to. They won't be notified."
        action={
          <Button asChild variant="secondary">
            <Link href="/matches">Browse matches</Link>
          </Button>
        }
      />
    );
  }
  if (filterCount > 0 || filters.q) {
    return (
      <EmptyState
        icon={<SearchX strokeWidth={1.5} />}
        title="No one matches that"
        description="Try a wider budget, more neighborhoods, or clearing your search."
        action={<Button onClick={onClear}>Clear filters</Button>}
      />
    );
  }
  return (
    <EmptyState
      art={<GhostCards />}
      title="Your matches are on their way"
      description="We only show people who pass both of your dealbreakers. Loosening one or widening your budget usually helps — and new students join every day."
      action={
        <Button asChild>
          <Link href="/settings/profile">Adjust preferences</Link>
        </Button>
      }
    />
  );
}

/** Empty-state art built from the product's own card shapes. */
function GhostCards() {
  return (
    <div className="relative mb-8 h-28 w-44" aria-hidden>
      {[-10, 0, 10].map((rotate, i) => (
        <div
          key={rotate}
          className="absolute inset-x-6 top-0 h-28 rounded-lg bg-surface shadow-md ring-1 ring-line"
          style={{
            transform: `rotate(${rotate}deg) translateX(${rotate * 1.6}px)`,
            zIndex: i === 1 ? 2 : 1,
          }}
        >
          <div className="m-2 h-14 rounded-md bg-surface-sunken" />
          <div className="mx-2 h-2 w-12 rounded-full bg-surface-sunken" />
          {i === 1 ? (
            <span className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink shadow-sm ring-2 ring-accent">
              ?
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function filterChips(f: FeedFilters, areas: { slug: string; name: string }[]) {
  const chips: { key: string; label: string; remove: (f: FeedFilters) => FeedFilters }[] = [];
  if (f.budgetMin || f.budgetMax) {
    chips.push({
      key: "budget",
      label: `${f.budgetMin ? formatMoney(f.budgetMin) : "Any"} – ${f.budgetMax ? formatMoney(f.budgetMax) : "any"}`,
      remove: (x) => ({ ...x, budgetMin: null, budgetMax: null }),
    });
  }
  for (const slug of f.areas) {
    const name = areas.find((a) => a.slug === slug)?.name.split(" — ")[0] ?? slug;
    chips.push({
      key: `area-${slug}`,
      label: name,
      remove: (x) => ({ ...x, areas: x.areas.filter((a) => a !== slug) }),
    });
  }
  if (f.moveFrom || f.moveTo) {
    chips.push({
      key: "move",
      label: `Move-in ${f.moveFrom ?? "…"} → ${f.moveTo ?? "…"}`,
      remove: (x) => ({ ...x, moveFrom: null, moveTo: null }),
    });
  }
  for (const g of f.genders) {
    chips.push({
      key: `g-${g}`,
      label: labelOf(ROOMMATE_GENDERS, g),
      remove: (x) => ({ ...x, genders: x.genders.filter((v) => v !== g) }),
    });
  }
  for (const y of f.years) {
    chips.push({
      key: `y-${y}`,
      label: labelOf(CLASS_YEARS, y),
      remove: (x) => ({ ...x, years: x.years.filter((v) => v !== y) }),
    });
  }
  return chips;
}
