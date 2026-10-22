"use client";

import { ShieldCheck } from "lucide-react";
import { MultiChips } from "@/components/ui/choice";
import { DEALBREAKERS } from "@/lib/options";
import type { StepProps } from "../types";

export function DealbreakersStep({ prefs, updatePrefs }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <MultiChips
        aria-label="Dealbreakers"
        value={prefs.dealbreakers}
        onValueChange={(dealbreakers) => updatePrefs({ dealbreakers })}
        options={DEALBREAKERS}
      />
      <div className="flex gap-3 rounded-lg bg-surface-sunken p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
        <p className="text-body-sm text-ink-2">
          Dealbreakers are hard filters in both directions. Fewer dealbreakers means more matches —
          everything else still shapes your score through your priorities.
        </p>
      </div>
    </div>
  );
}
