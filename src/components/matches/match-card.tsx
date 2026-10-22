"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { displayName, formatBudget } from "@/lib/utils";

export function MatchCard({
  id,
  firstName,
  lastInitial,
  photoUrl,
  year,
  major,
  budgetMin,
  budgetMax,
  areas,
  moveIn,
  score,
  inCommon,
  sharedArtists,
  mutualCount = 0,
}: {
  id: string;
  firstName: string;
  lastInitial: string;
  photoUrl: string | null;
  year: string;
  major: string;
  budgetMin: number;
  budgetMax: number;
  areas: string[];
  moveIn: string;
  score: number;
  inCommon: string[];
  sharedArtists: string[];
  mutualCount?: number;
}) {
  return (
    <motion.div layoutId={`match-card-${id}`} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <Link
        href={`/profile/${id}`}
        className="block overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-elevation1 transition duration-base hover:border-border-strong hover:shadow-elevation2"
      >
        <div className="aspect-[4/3] bg-bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="font-ui flex h-full items-center justify-center text-4xl font-semibold text-accent/40">
              {firstName.charAt(0)}
              {lastInitial}
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-ui text-lg font-semibold text-ink">
                {displayName(firstName, lastInitial)}
              </h2>
              <p className="text-sm text-ink-muted">
                {year} · {major}
              </p>
            </div>
            <span className="font-ui rounded-md bg-accent-soft px-2 py-1 text-sm font-bold tabular-nums text-accent">
              {Math.round(score)}%
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            {formatBudget(budgetMin, budgetMax)} · {moveIn}
          </p>
          <p className="line-clamp-1 text-xs text-ink-muted">{areas.join(", ")}</p>
          <div className="flex flex-wrap gap-1">
            {mutualCount > 0 ? (
              <span className="font-ui rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-contrast">
                {mutualCount} mutual{mutualCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {inCommon.slice(0, 3).map((t) => (
              <span
                key={t}
                className="font-ui rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                {t}
              </span>
            ))}
          </div>
          {sharedArtists.length ? (
            <p className="text-[11px] text-ink-muted">
              Shared artists: {sharedArtists.slice(0, 3).join(", ")}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
