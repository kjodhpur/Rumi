"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, EyeOff, HandCoins, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { spring } from "@/lib/motion";
import { PhoneMockup } from "./phone-mockup";
import { useHasSession } from "./session-aware";

const HEADLINE = [
  { text: "Find" },
  { text: "a" },
  { text: "roommate" },
  { text: "you'll" },
  { text: "actually", italic: true },
  { text: "like", italic: true },
  { text: "living" },
  { text: "with." },
];

export function Hero() {
  const signedIn = useHasSession();
  return (
    <section className="relative overflow-x-clip pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <div className="max-w-[640px]">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1.5 text-caption font-medium text-ink-2 shadow-xs ring-1 ring-line">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-ink">Now open</span>
            Free for {LAUNCH_SCHOOL.shortName} students
          </p>

          <h1 className="mt-6 font-display text-[44px] !leading-[1.04] tracking-[-0.025em] text-ink sm:text-display-xl lg:text-display-2xl">
            {HEADLINE.map((word, i) => (
              <span key={i}>
                <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-bottom">
                  <span
                    className={`inline-block animate-rise ${word.italic ? "pr-[0.04em] italic" : ""}`}
                    style={{ animationDelay: `${80 + i * 30}ms` }}
                  >
                    {word.text}
                  </span>
                </span>
                {i < HEADLINE.length - 1 ? " " : null}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-[520px] text-body text-ink-2 sm:text-title sm:font-normal">
            Answer a few questions about how you live. Rumi ranks every verified {LAUNCH_SCHOOL.shortName} student by how
            well you&apos;d get along — a score out of 100, with the reasons why. No swiping.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="xl" className="group">
              <Link href={signedIn ? "/matches" : "/login"}>
                {signedIn ? "Open your matches" : "Get started — it's free"}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
              </Link>
            </Button>
            <Button asChild size="xl" variant="ghost">
              <a href="#ranking">See how ranking works</a>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-body-sm text-ink-2">
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden />
              Verified @{LAUNCH_SCHOOL.domain} only
            </li>
            <li className="flex items-center gap-2">
              <HandCoins className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden />
              Free, no ads
            </li>
            <li className="flex items-center gap-2">
              <EyeOff className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden />
              Private by default
            </li>
          </ul>
        </div>

        <div className="relative mx-auto lg:mr-8">
          {/* Mobile shows the top of the phone, fading out; desktop shows all of it. */}
          <div className="relative max-h-[460px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] sm:max-h-[540px] lg:max-h-none lg:overflow-visible lg:[mask-image:none]">
            <div className="animate-lift" style={{ animationDelay: "160ms" }}>
              <PhoneMockup />
            </div>
          </div>
          <WhyCallout />
        </div>
      </div>
    </section>
  );
}

/** Floating "why you match" card beside the phone (desktop). */
function WhyCallout() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ ...spring, delay: 1.1 }}
      className="absolute top-[46%] -left-[220px] hidden w-[264px] rounded-xl bg-surface p-4 shadow-lg ring-1 ring-line xl:block"
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={94} size={40} animateOnMount delay={1.25} />
        <div>
          <p className="text-body-sm font-semibold text-ink">Why you match Maya</p>
          <p className="text-caption text-ink-3">Top reasons, from both sides</p>
        </div>
      </div>
      <ul className="mt-3.5 flex flex-col gap-2">
        {["You're both night owls", "Budgets overlap by $200", "Both looking in Tempe"].map((reason, i) => (
          <motion.li
            key={reason}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 1.35 + i * 0.03 }}
            className="flex items-center gap-2 text-body-sm text-ink"
          >
            <Sparkle className="size-3.5 shrink-0 fill-accent text-accent" strokeWidth={0} />
            {reason}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
