"use client";

import * as React from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Button } from "@/components/ui/button";
import { Monogram } from "@/components/ui/monogram";
import { spring } from "@/lib/motion";

/**
 * The payoff moment after onboarding: your photo, a ring that sweeps while we
 * "look", then the number of people who fit — counting up.
 */
export function FinishScreen({
  matches,
  firstName,
  avatarUrl,
  onContinue,
}: {
  matches: number;
  firstName: string;
  avatarUrl: string | null;
  onContinue: () => void;
}) {
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (reduce) {
      count.set(matches);
      setDone(true);
      return;
    }
    const controls = animate(count, matches, { duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] });
    const timer = setTimeout(() => setDone(true), 1500);
    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [matches, reduce, count]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="relative size-40">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="80" cy="80" r="74" fill="none" stroke="var(--line)" strokeWidth="4" />
          <motion.circle
            cx="80"
            cy="80"
            r="74"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </svg>
        <motion.div
          initial={reduce ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="absolute inset-3 overflow-hidden rounded-full bg-surface-sunken"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="136px" className="object-cover" />
          ) : (
            <Monogram name={firstName || "?"} className="size-full [container-type:size]" />
          )}
        </motion.div>
      </div>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.25 }}
        className="mt-10 font-display text-display-lg text-ink"
      >
        {matches > 0 ? (
          <>
            <motion.span className="tabular">{rounded}</motion.span> {matches === 1 ? "person fits" : "people fit"}
            <br />
            how you live.
          </>
        ) : (
          <>You&apos;re all set{firstName ? `, ${firstName}` : ""}.</>
        )}
      </motion.h1>
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-3 max-w-sm text-body text-ink-2"
      >
        {matches > 0
          ? "Ranked by compatibility, each with the reasons you'd get along."
          : "We'll let you know as soon as compatible people join."}
      </motion.p>
      <motion.div
        initial={false}
        animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
        transition={spring}
        className="mt-10 w-full max-w-xs"
      >
        <Button size="lg" block onClick={onContinue} disabled={!done}>
          See my matches
        </Button>
      </motion.div>
    </div>
  );
}
