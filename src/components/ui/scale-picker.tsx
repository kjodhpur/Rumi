"use client";

import * as React from "react";
import { RadioGroup } from "radix-ui";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

interface ScalePickerProps {
  value: number;
  onValueChange: (value: number) => void;
  /** One short description per step, shown under the picker for the selected value. */
  steps: string[];
  minLabel: string;
  maxLabel: string;
  "aria-label": string;
  className?: string;
}

/** A 1–N lifestyle scale as tappable steps instead of a fiddly slider. */
export function ScalePicker({
  value,
  onValueChange,
  steps,
  minLabel,
  maxLabel,
  className,
  ...aria
}: ScalePickerProps) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <RadioGroup.Root
        value={String(value)}
        onValueChange={(v) => onValueChange(Number(v))}
        orientation="horizontal"
        className="grid gap-1.5 rounded-lg bg-surface-sunken p-1.5"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        {...aria}
      >
        {steps.map((step, index) => {
          const n = index + 1;
          const selected = n === value;
          return (
            <RadioGroup.Item
              key={n}
              value={String(n)}
              aria-label={step}
              className={cn(
                "relative flex h-11 items-center justify-center rounded-md text-body-sm font-semibold tabular outline-none",
                "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus",
                selected ? "text-ink-inverse" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId={`${id}-thumb`}
                  transition={springSnappy}
                  className="absolute inset-0 rounded-md bg-ink shadow-sm"
                />
              ) : null}
              <span className="relative z-10">{n}</span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
      <div className="flex items-start justify-between gap-4 text-caption text-ink-3">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
      <p className="text-body-sm text-ink-2" aria-live="polite">
        {steps[value - 1]}
      </p>
    </div>
  );
}
