import * as React from "react";
import { cn } from "@/lib/utils";

/** A labelled group inside a step: question label, optional hint, then the control. */
export function Section({
  label,
  hint,
  error,
  children,
  className,
  id,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const autoId = React.useId();
  const labelId = id ?? `${autoId}-label`;
  return (
    <section className={cn("flex flex-col gap-3", className)} aria-labelledby={labelId}>
      <div>
        <h3 id={labelId} className="text-body font-medium text-ink">
          {label}
        </h3>
        {hint ? <p className="mt-0.5 text-body-sm text-ink-3">{hint}</p> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
