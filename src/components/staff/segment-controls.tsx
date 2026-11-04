"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/toggle-chip";
import {
  SEGMENT_DIMENSIONS,
  SEGMENT_METRICS,
  type SegmentDimension,
  type SegmentMetric,
} from "@/lib/staff/segments";

/** Filters in one row above the chart (dimension, metric, up to three segments to compare). */
export function SegmentControls({
  dimension,
  metric,
  values,
  compare,
}: {
  dimension: SegmentDimension;
  metric: SegmentMetric;
  values: { value: string; label: string }[];
  compare: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = React.useTransition();
  const go = (next: { dim?: string; metric?: string; compare?: string[] }) => {
    const p = new URLSearchParams({ dim: next.dim ?? dimension, metric: next.metric ?? metric });
    const c = next.dim && next.dim !== dimension ? [] : (next.compare ?? compare);
    if (c.length) p.set("compare", c.join(","));
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-[640px]">
        <Field label="Segment by">
          {({ id }) => (
            <Select id={id} value={dimension} onChange={(e) => go({ dim: e.target.value })}>
              {SEGMENT_DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Metric">
          {({ id }) => (
            <Select id={id} value={metric} onChange={(e) => go({ metric: e.target.value })}>
              {SEGMENT_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {values.length > 1 ? (
        <div
          role="group"
          aria-label="Compare up to three segments"
          className="flex flex-wrap gap-2"
        >
          {values.map((v) => {
            const on = compare.includes(v.value);
            return (
              <ToggleChip
                key={v.value}
                pressed={on}
                disabled={!on && compare.length >= 3}
                onPressedChange={(p) =>
                  go({ compare: p ? [...compare, v.value] : compare.filter((x) => x !== v.value) })
                }
              >
                {v.label}
              </ToggleChip>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
