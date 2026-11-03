"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { count as fmt, isSuppressed } from "@/lib/staff/metrics";

/**
 * Small, single-series charts for the staff dashboard. One validated hue (--chart-1),
 * thin marks with 4px rounded data-ends, hairline grid, a hover/focus tooltip on every
 * mark, and a table view for every chart. Counts of 1–4 are drawn as a stub and read "<5".
 */

export interface Datum {
  label: string;
  /** Longer label for tooltips and the table (defaults to label). */
  detail?: string;
  value: number;
}

function niceMax(max: number) {
  if (max <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= max)! * magnitude;
  return Math.ceil(max / step) * step;
}

/** Suppressed counts get a fixed stub so the bar's length can't reveal the exact number. */
const STUB = 0.04;

function ChartFrame({
  title,
  description,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  table: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  const id = React.useId();
  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex flex-col rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-body font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-caption text-ink-3">{description}</p> : null}
        </div>
        <div role="group" aria-label={`${title}: view`} className="flex shrink-0 rounded-md bg-surface-sunken p-0.5">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-7 rounded-sm px-2.5 text-caption font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-focus",
                view === v ? "bg-surface text-ink shadow-xs" : "text-ink-3 hover:text-ink",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>
      <div className="mt-4 min-h-0 flex-1">{view === "chart" ? children : table}</div>
    </section>
  );
}

function DataTable({ data, valueLabel }: { data: Datum[]; valueLabel: string }) {
  return (
    <table className="w-full text-left text-body-sm">
      <thead className="text-caption text-ink-3">
        <tr className="border-b border-line">
          <th scope="col" className="py-2 font-medium">
            &nbsp;
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            {valueLabel}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {data.map((d) => (
          <tr key={d.label}>
            <th scope="row" className="py-2 font-normal text-ink-2">
              {d.detail ?? d.label}
            </th>
            <td className="py-2 text-right text-ink tabular-nums">{fmt(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tooltip({ datum, valueLabel }: { datum: Datum; valueLabel: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-left whitespace-nowrap text-ink-inverse shadow-md"
    >
      <span className="block text-body-sm font-semibold tabular-nums">{fmt(datum.value)}</span>
      <span className="block text-caption opacity-80">
        {valueLabel} · {datum.detail ?? datum.label}
      </span>
    </span>
  );
}

/** Vertical columns (weeks, score bins). */
export function ColumnChart({
  title,
  description,
  data,
  valueLabel,
  height = 140,
  labelEvery = 1,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueLabel: string;
  height?: number;
  /** Show every Nth x label (dense weekly charts). */
  labelEvery?: number;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const summary = `${title}. ${data.map((d) => `${d.detail ?? d.label}: ${fmt(d.value)}`).join("; ")}.`;

  return (
    <ChartFrame title={title} description={description} table={<DataTable data={data} valueLabel={valueLabel} />}>
      <div className="flex gap-2" role="img" aria-label={summary}>
        <div aria-hidden className="relative w-7 shrink-0 text-right text-micro text-ink-3 tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {t.toLocaleString("en-US")}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} aria-hidden className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-0.5">
              {data.map((d, i) => {
                const share = d.value === 0 ? 0 : isSuppressed(d.value) ? STUB : d.value / max;
                return (
                  <button
                    key={d.label}
                    type="button"
                    tabIndex={0}
                    aria-label={`${d.detail ?? d.label}: ${fmt(d.value)}`}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive((a) => (a === i ? null : a))}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <span
                      className={cn(
                        "block w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity duration-150",
                        isSuppressed(d.value) && "opacity-60",
                        active !== null && active !== i && "opacity-50",
                      )}
                      style={{ height: `${share * 100}%` }}
                    />
                    {active === i ? <Tooltip datum={d} valueLabel={valueLabel} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div aria-hidden className="mt-1.5 flex gap-0.5 text-micro text-ink-3">
            {data.map((d, i) => (
              <span key={d.label} className="min-w-0 flex-1 truncate text-center">
                {i % labelEvery === 0 ? d.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}

/** Horizontal bars with the value at the tip (funnel stages). */
export function BarList({
  title,
  description,
  data,
  valueLabel,
  extra,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueLabel: string;
  /** Right-hand annotation per row, e.g. the share of the first stage. */
  extra?: (d: Datum, index: number) => string | null;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ChartFrame title={title} description={description} table={<DataTable data={data} valueLabel={valueLabel} />}>
      <ol className="flex flex-col gap-3">
        {data.map((d, i) => {
          const share = d.value === 0 ? 0 : isSuppressed(d.value) ? STUB : d.value / max;
          const note = extra?.(d, i);
          return (
            <li key={d.label}>
              <div className="flex items-baseline justify-between gap-3 text-body-sm">
                <span className="truncate text-ink-2">{d.detail ?? d.label}</span>
                <span className="shrink-0 text-ink tabular-nums">
                  <span className="font-semibold">{fmt(d.value)}</span>
                  {note ? <span className="ml-1.5 text-caption text-ink-3">{note}</span> : null}
                </span>
              </div>
              <button
                type="button"
                aria-label={`${d.detail ?? d.label}: ${fmt(d.value)}${note ? `, ${note}` : ""}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                className="relative mt-1.5 block h-3 w-full rounded-full bg-surface-sunken outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-r-[4px] bg-chart-1 transition-opacity duration-150",
                    isSuppressed(d.value) && "opacity-60",
                    active !== null && active !== i && "opacity-50",
                  )}
                  style={{ width: `${share * 100}%` }}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </ChartFrame>
  );
}
