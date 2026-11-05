"use client";

import * as React from "react";
import { labelOf, CLASS_YEARS, HOUSING_TYPES } from "@/lib/options";
import { BIN_LABELS, SCORE_BINS, count, segmentTable, type Overview } from "@/lib/staff/metrics";
import { cn } from "@/lib/utils";

const DIMENSIONS = [
  { value: "class_year", label: "Class year" },
  { value: "housing_type", label: "Housing type" },
] as const;

/** Best-match scores by segment, as a table (more classes than a chart can carry). Cells of 1–4 read "<5". */
export function ScoreSegments({ segments }: { segments: Overview["segments"] }) {
  const [dimension, setDimension] = React.useState<"class_year" | "housing_type">("class_year");
  const rows = segmentTable(segments, dimension);
  const nameOf = (value: string) => {
    if (value === "unknown") return "Not set";
    return dimension === "class_year" ? labelOf(CLASS_YEARS, value) : labelOf(HOUSING_TYPES, value);
  };

  return (
    <section
      aria-labelledby="segments-title"
      className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="segments-title" className="text-body font-semibold text-ink">
            Best-match scores by segment
          </h2>
          <p className="mt-0.5 text-caption text-ink-3">
            Any group smaller than 5 students shows as &ldquo;&lt;5&rdquo;.
          </p>
        </div>
        <div
          role="group"
          aria-label="Segment by"
          className="flex rounded-md bg-surface-sunken p-0.5"
        >
          {DIMENSIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={dimension === d.value}
              onClick={() => setDimension(d.value)}
              className={cn(
                "h-7 rounded-sm px-2.5 text-caption font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus",
                dimension === d.value
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-ink-3">No finished profiles yet.</p>
      ) : (
        <div
          role="region"
          tabIndex={0}
          aria-label="Score distribution by segment"
          className="-mx-5 mt-4 overflow-x-auto px-5 outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead className="text-caption text-ink-3">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {DIMENSIONS.find((d) => d.value === dimension)!.label}
                </th>
                {SCORE_BINS.map((bin) => (
                  <th key={bin} scope="col" className="px-2 py-2 text-right font-medium">
                    {BIN_LABELS[bin]}
                  </th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.value}>
                  <th scope="row" className="py-2 pr-3 font-normal text-ink-2">
                    {nameOf(row.value)}
                  </th>
                  {SCORE_BINS.map((bin) => (
                    <td key={bin} className="px-2 py-2 text-right text-ink tabular-nums">
                      {count(row.cells[bin])}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-medium text-ink tabular-nums">
                    {count(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
