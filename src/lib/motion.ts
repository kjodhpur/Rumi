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
export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: spring },
};
