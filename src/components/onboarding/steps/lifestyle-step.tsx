"use client";

import { ScalePicker } from "@/components/ui/scale-picker";
import { SCALES } from "@/lib/options";
import type { StepProps } from "../types";
import { Section } from "./section";

const KEYS = [
  ["sleep_schedule", "sleepSchedule"],
  ["cleanliness", "cleanliness"],
  ["noise", "noise"],
  ["guests", "guests"],
] as const;

export function LifestyleStep({ prefs, updatePrefs }: StepProps) {
  return (
    <div className="flex flex-col gap-10">
      {KEYS.map(([scaleKey, prefKey]) => {
        const scale = SCALES[scaleKey];
        return (
          <Section key={scaleKey} label={scale.label}>
            <ScalePicker
              aria-label={scale.label}
              value={prefs[prefKey]}
              onValueChange={(value) => updatePrefs({ [prefKey]: value })}
              steps={[...scale.steps]}
              minLabel={scale.min}
              maxLabel={scale.max}
            />
          </Section>
        );
      })}
    </div>
  );
}
