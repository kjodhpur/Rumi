"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";

export function MatchesFilters({
  campuses,
  years,
  moveIns,
  areas,
  current,
}: {
  campuses: string[];
  years: string[];
  moveIns: string[];
  areas: string[];
  current: Record<string, string | boolean>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) {
      if (typeof v === "boolean") {
        if (v) params.set(k, "1");
      } else if (v) {
        params.set(k, v);
      }
    }
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      className={`space-y-4 rounded-2xl border border-rumi-sand bg-white p-4 ${pending ? "opacity-70" : ""}`}
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="font-display text-lg font-semibold text-asu-maroon">Filters</p>

      <div className="space-y-1">
        <Label htmlFor="sort">Sort</Label>
        <select
          id="sort"
          className="h-10 w-full rounded-xl border border-rumi-sand bg-white px-2 text-sm"
          value={String(current.sort ?? "match")}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="match">Match %</option>
          <option value="newest">Newest</option>
          <option value="budget">Budget</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="minScore">Min match %</Label>
        <input
          id="minScore"
          type="number"
          min={0}
          max={100}
          className="h-10 w-full rounded-xl border border-rumi-sand px-2 text-sm"
          defaultValue={String(current.minScore ?? "")}
          onBlur={(e) => update("minScore", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="budgetMax">Max budget ($)</Label>
        <input
          id="budgetMax"
          type="number"
          className="h-10 w-full rounded-xl border border-rumi-sand px-2 text-sm"
          defaultValue={String(current.budgetMax ?? "")}
          onBlur={(e) => update("budgetMax", e.target.value)}
        />
      </div>

      {(
        [
          ["campus", campuses, "Campus"],
          ["year", years, "Year"],
          ["moveIn", moveIns, "Move-in"],
          ["area", areas, "Area"],
        ] as const
      ).map(([key, options, label]) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={key}>{label}</Label>
          <select
            id={key}
            className="h-10 w-full rounded-xl border border-rumi-sand bg-white px-2 text-sm"
            value={String(current[key] ?? "")}
            onChange={(e) => update(key, e.target.value)}
          >
            <option value="">Any</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="space-y-1">
        <Label htmlFor="placeStatus">Place</Label>
        <select
          id="placeStatus"
          className="h-10 w-full rounded-xl border border-rumi-sand bg-white px-2 text-sm"
          value={String(current.placeStatus ?? "")}
          onChange={(e) => update("placeStatus", e.target.value)}
        >
          <option value="">Any</option>
          <option value="has-place">Has a place</option>
          <option value="needs-place">Needs a place</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(current.spotifyOnly)}
          onChange={(e) => update("spotifyOnly", e.target.checked ? "1" : "")}
        />
        Spotify connected only
      </label>
    </form>
  );
}
