import type { MutualSummary } from "@/lib/types";

export function HowConnected({ summary }: { summary: MutualSummary }) {
  if (!summary.count) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold text-ink">How you’re connected</h2>
        <p className="text-sm text-ink-muted">
          No shared connections yet. Link socials or campus orgs in Settings to build your trust web.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-ui text-lg font-semibold text-ink">How you’re connected</h2>
        <span className="font-ui text-sm font-medium text-accent">
          {summary.count} mutual{summary.count === 1 ? "" : "s"}
          {summary.trustBonus > 0 ? ` · +${summary.trustBonus} trust` : ""}
        </span>
      </div>
      <ul className="space-y-2">
        {summary.connections.map((c) => (
          <li
            key={c.label}
            className="flex items-center gap-3 rounded-md bg-bg-muted/60 px-3 py-2 text-sm text-ink"
          >
            {c.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {(c.personName ?? c.label).charAt(0)}
              </span>
            )}
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
