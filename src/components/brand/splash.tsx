"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { WORDMARK } from "./glyphs";

/**
 * Splash / loading screen: the wordmark's letters rise out of a mask one after
 * another (transform + opacity only), then a hairline progress sweep loops
 * until the content is ready.
 */
export function Splash({ className, label = "Loading Rumi" }: { className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const height = 44;
  const width = (WORDMARK.width / WORDMARK.height) * height;
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg text-ink", className)}
    >
      <svg
        viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
        width={width}
        height={height}
        aria-hidden
        className="overflow-hidden fill-current"
      >
        {WORDMARK.letters.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            initial={reduce ? false : { y: WORDMARK.height * 0.9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 + i * 0.06 }}
          />
        ))}
      </svg>
      <div className="h-0.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden>
        <motion.div
          className="h-full w-1/2 rounded-full bg-ink"
          initial={{ x: "-100%" }}
          animate={reduce ? { x: "50%" } : { x: ["-100%", "200%"] }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.76, 0, 0.24, 1], repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </div>
  );
}
