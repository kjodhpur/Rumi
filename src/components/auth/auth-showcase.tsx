"use client";

import { motion } from "motion/react";
import { ScoreRing } from "@/components/ui/score-ring";
import { Monogram } from "@/components/ui/monogram";
import { MOCK_MATCHES } from "@/components/marketing/mock-data";
import { spring } from "@/lib/motion";

/** Desktop-only side panel: a live-feeling slice of the ranked list. */
export function AuthShowcase() {
  const rows = MOCK_MATCHES.slice(0, 3);
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-surface-sunken lg:flex lg:flex-col lg:justify-center lg:px-16"
    >
      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="font-display text-display-md text-ink">
          Your top matches,
          <br />
          <span className="text-ink-3 italic">ranked with reasons.</span>
        </p>
        <motion.ol
          className="mt-10 flex flex-col gap-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
        >
          {rows.map((row, index) => (
            <motion.li
              key={row.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: spring } }}
              className="flex items-center gap-4 rounded-lg bg-surface p-4 shadow-md ring-1 ring-line"
            >
              <span className="w-4 text-body-sm font-medium text-ink-3 tabular">{index + 1}</span>
              <Monogram name={row.name} className="size-12 shrink-0 [container-type:size]" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-ink">{row.name}</p>
                <p className="truncate text-caption text-ink-2">{row.reasons[0]}</p>
              </div>
              <ScoreRing score={row.score} size={44} animateOnMount delay={0.3 + index * 0.08} />
            </motion.li>
          ))}
        </motion.ol>
        <p className="mt-8 text-body-sm text-ink-3">
          Every score comes with the three biggest reasons you'd get along — and anything worth
          talking about first.
        </p>
      </div>
    </aside>
  );
}
