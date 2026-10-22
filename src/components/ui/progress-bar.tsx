"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

/** Progress animates scaleX on a full-width bar — transform only. */
export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <motion.div
        className="h-full w-full origin-left rounded-full bg-ink"
        initial={false}
        animate={{ scaleX: clamped }}
        transition={spring}
      />
    </div>
  );
}
