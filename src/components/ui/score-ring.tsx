"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Draw the ring and count the number up when mounted. */
  animateOnMount?: boolean;
  delay?: number;
  variant?: "compact" | "hero";
  className?: string;
}

/**
 * Compatibility score: the ring draws while the number counts up, in lockstep,
 * so the eye reads "this is how much of a match" before the digits settle.
 */
export function ScoreRing({
  score,
  size = 44,
  strokeWidth,
  animateOnMount = false,
  delay = 0,
  variant = "compact",
  className,
}: ScoreRingProps) {
  const reduce = useReducedMotion();
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = strokeWidth ?? (variant === "hero" ? 6 : 3);
  const radius = (size - stroke) / 2;
  const shouldAnimate = animateOnMount && !reduce;

  const progress = useMotionValue(shouldAnimate ? 0 : value);
  const rounded = useTransform(progress, (v) => Math.round(v));
  const pathLength = useTransform(progress, (v) => Math.max(0.001, v / 100));

  React.useEffect(() => {
    if (!shouldAnimate) {
      progress.set(value);
      return;
    }
    const controls = animate(progress, value, {
      duration: 0.9,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, shouldAnimate, delay, progress]);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% compatible`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ pathLength }}
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        {variant === "hero" ? (
          <>
            <motion.span className="font-display text-[44px] leading-none text-ink tabular">
              {rounded}
            </motion.span>
            <span className="mt-1 text-micro font-medium tracking-wide text-ink-3 uppercase">
              match
            </span>
          </>
        ) : (
          <motion.span
            className="font-semibold text-ink tabular"
            style={{ fontSize: Math.max(11, Math.round(size * 0.3)), letterSpacing: "-0.02em" }}
          >
            {rounded}
          </motion.span>
        )}
      </span>
    </div>
  );
}
