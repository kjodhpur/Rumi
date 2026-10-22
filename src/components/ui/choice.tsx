"use client";

import * as React from "react";
import { RadioGroup } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import { ToggleChip } from "./toggle-chip";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

/** Single choice as pills (radio semantics, arrow-key navigation). */
export function ChoiceChips<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...aria
}: {
  value: T | "";
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cn("flex flex-wrap gap-2", className)}
      {...aria}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RadioGroup.Item key={option.value} value={option.value} asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={springSnappy}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-body-sm font-medium outline-none",
                "transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                selected
                  ? "bg-ink text-ink-inverse shadow-sm"
                  : "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-hover",
              )}
            >
              {option.icon}
              {option.label}
            </motion.button>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}

/** Multiple choice as pills (toggle buttons in a labelled group). */
export function MultiChips<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...aria
}: {
  value: readonly T[];
  onValueChange: (value: T[]) => void;
  options: readonly Option<T>[];
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <div role="group" className={cn("flex flex-wrap gap-2", className)} {...aria}>
      {options.map((option) => (
        <ToggleChip
          key={option.value}
          pressed={value.includes(option.value)}
          icon={option.icon}
          onPressedChange={(pressed) =>
            onValueChange(pressed ? [...value, option.value] : value.filter((v) => v !== option.value))
          }
        >
          {option.label}
        </ToggleChip>
      ))}
    </div>
  );
}

/** Larger single-choice cards with an optional hint line. */
export function OptionCards<T extends string>({
  value,
  onValueChange,
  options,
  columns = 3,
  className,
  ...aria
}: {
  value: T | "";
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  columns?: 2 | 3 | 4;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
      {...aria}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RadioGroup.Item key={option.value} value={option.value} asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={springSnappy}
              className={cn(
                "relative flex min-h-[64px] flex-col items-start justify-center rounded-lg px-3.5 py-3 text-left outline-none",
                "transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-focus",
                selected
                  ? "bg-surface shadow-sm ring-2 ring-ink"
                  : "bg-surface ring-1 ring-line-strong hover:bg-surface-hover",
              )}
            >
              <span className="pr-5 text-body-sm font-medium text-ink">{option.label}</span>
              {option.hint ? <span className="mt-0.5 text-caption text-ink-3">{option.hint}</span> : null}
              <AnimatePresence initial={false}>
                {selected ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={springSnappy}
                    className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-ink text-ink-inverse"
                  >
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
