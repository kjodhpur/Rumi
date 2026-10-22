"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { DEFAULT_IMPORTANCE, FACTOR_LABELS, IMPORTANCE, WEIGHTED_FACTORS, type FactorKey, type Importance } from "@/lib/options";
import type { StepProps } from "../types";

const OPTIONS = IMPORTANCE.map((level) => ({
  value: String(level.value) as "0" | "1" | "2" | "3",
  label: level.short,
  ariaLabel: level.label,
}));

export function PrioritiesStep({ prefs, updatePrefs, musicEnabled }: StepProps & { musicEnabled: boolean }) {
  const factors = WEIGHTED_FACTORS.filter((f) => f !== "music" || musicEnabled);
  const valueOf = (key: FactorKey): Importance => prefs.weights[key] ?? DEFAULT_IMPORTANCE[key];
  return (
    <div className="flex flex-col">
      <p className="mb-4 text-body-sm text-ink-3">
        <span className="font-medium text-ink-2">Skip</span> ignores it ·{" "}
        <span className="font-medium text-ink-2">Must</span> counts six times as much as Nice.
      </p>
      <ul className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
        {factors.map((key) => (
          <li key={key} className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <span className="text-body-sm font-medium text-ink">{FACTOR_LABELS[key]}</span>
            <SegmentedControl
              size="sm"
              aria-label={`How much ${FACTOR_LABELS[key].toLowerCase()} matters`}
              className="sm:w-[300px]"
              value={String(valueOf(key)) as "0" | "1" | "2" | "3"}
              onValueChange={(v) => updatePrefs({ weights: { ...prefs.weights, [key]: Number(v) as Importance } })}
              options={OPTIONS}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
