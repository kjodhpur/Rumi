"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  /** Optional element aligned to the right of the label (counter, link). */
  aside?: React.ReactNode;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

/** Label + control + hint/error wiring with correct aria attributes. */
export function Field({ label, hint, error, className, aside, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label || aside ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? <Label htmlFor={id}>{label}</Label> : <span />}
          {aside ? <span className="text-caption text-ink-3">{aside}</span> : null}
        </div>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      <AnimatePresence initial={false} mode="popLayout">
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-body-sm text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={hintId} className="text-body-sm text-ink-3">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
