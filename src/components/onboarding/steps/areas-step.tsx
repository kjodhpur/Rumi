"use client";

import { motion } from "motion/react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import type { AreaOption, StepProps } from "../types";

export function AreasStep({ prefs, updatePrefs, errors, areas }: StepProps & { areas: AreaOption[] }) {
  const toggle = (slug: string) => {
    const next = prefs.areas.includes(slug) ? prefs.areas.filter((a) => a !== slug) : [...prefs.areas, slug];
    updatePrefs({ areas: next });
  };
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Neighborhoods" className="grid gap-2 sm:grid-cols-2">
        {areas.map((area) => {
          const selected = prefs.areas.includes(area.slug);
          return (
            <motion.button
              key={area.slug}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(area.slug)}
              whileTap={{ scale: 0.98 }}
              transition={springSnappy}
              className={cn(
                "flex items-start gap-3 rounded-lg bg-surface p-4 text-left outline-none",
                "transition-[box-shadow,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-focus",
                selected ? "shadow-sm ring-2 ring-ink" : "ring-1 ring-line-strong hover:bg-surface-hover",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                  selected ? "bg-ink text-ink-inverse" : "bg-surface-sunken text-ink-2",
                )}
              >
                {selected ? (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                ) : (
                  <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-ink">{area.name}</span>
                <span className="mt-0.5 block text-caption text-ink-3">{area.description}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
      {errors.areas ? (
        <p role="alert" className="text-body-sm text-danger">
          {errors.areas}
        </p>
      ) : (
        <p className="text-body-sm text-ink-3" aria-live="polite">
          {prefs.areas.length === 0
            ? "Pick as many as you'd honestly consider."
            : `${prefs.areas.length} selected`}
        </p>
      )}
    </div>
  );
}
