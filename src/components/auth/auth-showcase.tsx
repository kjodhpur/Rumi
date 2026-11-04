"use client";

import { motion } from "motion/react";
import { ScoreRing } from "@/components/ui/score-ring";
import { Monogram } from "@/components/ui/monogram";
import { MOCK_MATCHES } from "@/components/marketing/mock-data";
import { spring } from "@/lib/motion";
import { useT } from "@/components/providers/i18n";

/** Desktop-only side panel: a live-feeling slice of the ranked list. */
export function AuthShowcase() {
  const rows = MOCK_MATCHES.slice(0, 3);
  const t = useT("auth");
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-surface-sunken lg:flex lg:flex-col lg:justify-center lg:px-16"
    >
      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="font-display text-display-md text-ink">
          {t("showcase.title")}
          <br />
          <span className="text-ink-3 italic">{t("showcase.subtitle")}</span>
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
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: spring },
              }}
              className="flex items-center gap-4 rounded-lg bg-surface p-4 shadow-md ring-1 ring-line"
            >
              <span className="w-4 text-body-sm font-medium text-ink-3 tabular">{index + 1}</span>
              <Monogram name={row.name} className="[container-type:size] size-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-ink">{row.name}</p>
                <p className="truncate text-caption text-ink-2">
                  {t(`showcase.reasons.${row.id as "m1" | "m2" | "m3"}`)}
                </p>
              </div>
              <ScoreRing score={row.score} size={44} animateOnMount delay={0.3 + index * 0.08} />
            </motion.li>
          ))}
        </motion.ol>
        <p className="mt-8 text-body-sm text-ink-3">{t("showcase.footer")}</p>
      </div>
    </aside>
  );
}
