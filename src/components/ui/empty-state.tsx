import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Optional illustration slot (composed from UI fragments, never stock art). */
  art?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, art }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      {art ??
        (icon ? (
          <div className="mb-6 flex size-14 items-center justify-center rounded-lg bg-surface text-ink-2 shadow-sm ring-1 ring-line [&_svg]:size-6">
            {icon}
          </div>
        ) : null)}
      <h2 className="font-display text-display-sm text-ink">{title}</h2>
      {description ? <p className="mt-2 text-body-sm text-ink-2">{description}</p> : null}
      {action ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  );
}
