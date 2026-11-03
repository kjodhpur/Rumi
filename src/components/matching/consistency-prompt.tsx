"use client";

import * as React from "react";
import { Info, X } from "lucide-react";
import { type ConsistencyFlag } from "@/lib/matching/consistency";
import { dismissConsistencyFlag } from "@/app/actions/consistency";

export function ConsistencyPrompt({
  flags,
  onDismiss,
}: {
  flags: ConsistencyFlag[];
  onDismiss?: (ruleKey: string) => void;
}) {
  const [dismissedKeys, setDismissedKeys] = React.useState<Set<string>>(new Set());

  const activeFlags = flags.filter((f) => !dismissedKeys.has(f.ruleKey));
  if (activeFlags.length === 0) return null;

  async function handleDismiss(ruleKey: string) {
    setDismissedKeys((prev) => new Set([...prev, ruleKey]));
    onDismiss?.(ruleKey);
    void dismissConsistencyFlag(ruleKey);
  }

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {activeFlags.map((flag) => (
        <div
          key={flag.ruleKey}
          className="relative rounded-xl border border-line bg-surface p-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <p className="text-body-sm font-semibold text-ink">{flag.title}</p>
                <p className="mt-1 text-caption text-ink-2">{flag.message}</p>
                <p className="mt-1.5 text-caption font-medium text-ink-3">
                  Private guidance for you · Does not affect your match score
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleDismiss(flag.ruleKey)}
              className="text-ink-3 hover:text-ink transition-colors p-1"
              aria-label="Dismiss guidance"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
