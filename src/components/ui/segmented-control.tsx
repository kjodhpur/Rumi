"use client";

import * as React from "react";
import { RadioGroup } from "radix-ui";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible label when `label` is an icon. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  size?: "sm" | "md";
  className?: string;
  "aria-label": string;
}

/** Radio group with a pill that slides to the selected option. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const id = React.useId();
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      orientation="horizontal"
      className={cn(
        "inline-flex w-full items-stretch gap-0.5 rounded-md bg-surface-sunken p-1",
        className,
      )}
      {...aria}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              "relative flex flex-1 items-center justify-center rounded-sm font-medium whitespace-nowrap outline-none",
              "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus",
              size === "sm" ? "h-7 px-2.5 text-caption" : "h-9 px-3 text-body-sm",
              selected ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`${id}-pill`}
                transition={springSnappy}
                className="absolute inset-0 rounded-sm bg-surface shadow-sm ring-1 ring-line dark:bg-surface-raised"
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">{option.label}</span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
