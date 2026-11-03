"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Student moments the product handles — cycled in the landing hero.
 * Funny, human, not pitch-deck. Keep them concrete.
 */
export const HERO_ONE_LINERS = [
  "That awkward week when you need a roommate for next semester and every option is a random from a Facebook housing post.",
  "Finding a roommate you’d actually trust — before you sign a lease with a stranger from a group chat.",
  `Scrolling ${LAUNCH_SCHOOL.city} apartment Facebook groups at 1 a.m. like it’s a personality quiz.`,
  "When the dorm lottery hands you a triple and you’re suddenly apartment-hunting off Apache.",
  "Your “friend of a friend” who seemed chill — until you realize you only know their Instagram handle.",
  "When “looking for a chill roommate!!” is the entire screening process.",
  "Trying to decode “clean-ish, mostly nocturnal” before you share a bathroom.",
  "The group chat that goes silent the second someone asks about rent and quiet hours.",
  "Needing someone who won’t ghost the lease walkthrough — or leave dishes until midterms.",
  "August is three weeks out and you’re still matching with people named “DM me.”",
  "Passing the “would I leave them alone with my DoorDash” roommate test.",
  `Skipping the ${LAUNCH_SCHOOL.shortName} stranger roulette for someone who actually lives like you do.`,
] as const;

const INTERVAL_MS = 4800;
const REDUCED_INTERVAL_MS = 8000;

type Props = {
  className?: string;
};

export function HeroOneLiners({ className }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const ms = reduce ? REDUCED_INTERVAL_MS : INTERVAL_MS;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_ONE_LINERS.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [paused, reduce]);

  const line = HERO_ONE_LINERS[index]!;
  const textClass = "max-w-[520px] text-body text-ink-2 sm:text-title sm:font-normal";

  return (
    <div
      className={cn("relative mt-6", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {/* Same grid cell for every line so the tallest one reserves height. */}
      <div className="grid">
        {HERO_ONE_LINERS.map((candidate) => (
          <p key={candidate} className={cn(textClass, "invisible col-start-1 row-start-1")} aria-hidden>
            {candidate}
          </p>
        ))}

        <div className="col-start-1 row-start-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={line}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: duration.slow, ease }
              }
              className={textClass}
              aria-live="polite"
              aria-atomic="true"
            >
              {line}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
