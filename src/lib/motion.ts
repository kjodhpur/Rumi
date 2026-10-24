import type { Transition, Variants } from "motion/react";

/** Default UI spring — stiffness 300, damping 30 (≈ 250ms settle, no bounce). */
export const spring: Transition = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

/** Small, quick elements: presses, toggles, chips. */
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 35, mass: 0.8 };

/** Large surfaces: sheets, overlays, the card → profile morph. */
export const springSheet: Transition = { type: "spring", stiffness: 320, damping: 34, mass: 1 };

export const ease = [0.22, 1, 0.36, 1] as const;

export const duration = { fast: 0.15, base: 0.2, slow: 0.3 } as const;

export const fade: Transition = { duration: duration.base, ease };

/** List reveal: opacity + 8px rise, 30ms stagger. Used for first paint only. */
/** 30ms stagger for list entrances (pairs with the `animate-reveal` class); later batches restart the count. */
export function revealDelay(index: number, batch = 12) {
  return { animationDelay: `${20 + (index % batch) * 30}ms` };
}
