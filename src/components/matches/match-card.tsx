import Link from "next/link";
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
}) {
  return (
    <Link
      href={`/profile/${id}`}
      className="block overflow-hidden rounded-2xl border border-rumi-sand bg-white transition hover:border-asu-maroon/30 hover:shadow-md"
    >
      <div className="aspect-[4/3] bg-rumi-sand">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl text-asu-maroon/40">
            {firstName.charAt(0)}
            {lastInitial}
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-rumi-ink">
              {displayName(firstName, lastInitial)}
            </h2>
            <p className="text-sm text-rumi-muted">
              {year} · {major}
            </p>
          </div>
          <span className="rounded-lg bg-asu-gold px-2 py-1 font-display text-sm font-bold text-asu-maroon">
            {Math.round(score)}%
          </span>
        </div>
        <p className="text-xs text-rumi-muted">
          {formatBudget(budgetMin, budgetMax)} · {moveIn}
        </p>
        <p className="line-clamp-1 text-xs text-rumi-muted">{areas.join(", ")}</p>
        {inCommon.length ? (
          <div className="flex flex-wrap gap-1">
            {inCommon.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-asu-maroon/10 px-2 py-0.5 text-[11px] font-medium text-asu-maroon"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {sharedArtists.length ? (
          <p className="text-[11px] text-rumi-muted">
            Shared artists: {sharedArtists.slice(0, 3).join(", ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
