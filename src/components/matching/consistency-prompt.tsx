"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightbulb, X } from "lucide-react";
import { dismissConsistencyFlag } from "@/app/actions/consistency";
import {
  checkAnswerConsistency,
  visibleFlags,
  type ConsistencyInput,
} from "@/lib/matching/consistency";

/**
 * Gentle inline prompts for answers that pull in different directions (1.D). Private,
 * dismissible, and never part of the score.
 */
export function ConsistencyPrompt({
  input,
  dismissed: initial,
}: {
  input: ConsistencyInput;
  dismissed: { ruleKey: string; signature: string }[];
}) {
  const [dismissed, setDismissed] = React.useState(initial);
  const flags = visibleFlags(checkAnswerConsistency(input), dismissed);

  function dismiss(ruleKey: string, signature: string) {
    setDismissed((d) => [...d.filter((x) => x.ruleKey !== ruleKey), { ruleKey, signature }]);
    void dismissConsistencyFlag({ ruleKey, signature });
  }

  return (
    <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
      <AnimatePresence initial={false}>
        {flags.map((flag) => (
          <motion.div
            key={flag.ruleKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 rounded-lg bg-warning-soft p-4 ring-1 ring-line"
          >
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium text-ink">{flag.title}</p>
              <p className="mt-0.5 text-body-sm text-ink-2">{flag.message}</p>
              <p className="mt-1.5 text-caption text-ink-3">
                Only you see this. It doesn&apos;t change your score.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(flag.ruleKey, flag.signature)}
              className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              aria-label={`Dismiss: ${flag.title}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function consistencyInput(prefs: {
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  study: string;
  smoking: string;
  drinking: string;
  weights: Partial<Record<string, number>>;
}): ConsistencyInput {
  return {
    sleepSchedule: prefs.sleepSchedule,
    cleanliness: prefs.cleanliness,
    noise: prefs.noise,
    guests: prefs.guests,
    study: prefs.study,
    smoking: prefs.smoking,
    drinking: prefs.drinking,
    weights: prefs.weights,
  };
}
