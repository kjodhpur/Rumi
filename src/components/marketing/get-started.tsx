"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Eyebrow, SectionTitle } from "./section-heading";

const STEPS = [
  {
    title: "Verify your school email",
    body: `Enter your @${LAUNCH_SCHOOL.domain} address and the 6-digit code we send. No passwords, no strangers.`,
    vignette: <CodeVignette />,
  },
  {
    title: "Tell us how you live",
    body: "Budget, neighborhoods, move-in date and the everyday stuff — sleep, cleanliness, guests, noise. Mark what matters most.",
    vignette: <ScaleVignette />,
  },
  {
    title: "Send an intro",
    body: "Found someone great? Say hi with a short intro. When they accept, your chat opens — no cold DMs.",
    vignette: <IntroVignette />,
  },
];

export function GetStarted() {
  return (
    <section aria-labelledby="start-title" className="overflow-x-clip border-y border-line bg-surface-sunken/60 py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Getting started</Eyebrow>
          <SectionTitle id="start-title">Set up in about four minutes.</SectionTitle>
          <p className="mt-5 max-w-[420px] text-body text-ink-2">
            Answer once, and your list keeps itself up to date as new students join and as you tweak what you want.
          </p>
          <Button asChild size="lg" className="group mt-8">
            <Link href="/login">
              Create your profile
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "0px 0px -15% 0px" }}
              transition={{ ...spring, delay: i * 0.03 }}
              className="grid grid-cols-1 gap-6 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:p-7"
            >
              <div>
                <span className="font-display text-display-md text-ink-3 tabular">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-title text-ink">{step.title}</h3>
                <p className="mt-1.5 text-body-sm text-ink-2 sm:text-body">{step.body}</p>
              </div>
              <div aria-hidden className="rounded-lg bg-surface-sunken p-4">
                {step.vignette}
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CodeVignette() {
  const digits = ["4", "8", "1", "2", "9", ""];
  return (
    <div>
      <p className="text-caption text-ink-3">Code sent to you@{LAUNCH_SCHOOL.domain}</p>
      <div className="mt-2.5 flex gap-1.5">
        {digits.map((d, i) => (
          <span
            key={i}
            className={cn(
              "flex h-11 flex-1 items-center justify-center rounded-md bg-surface text-title font-semibold text-ink ring-1 ring-line-strong ring-inset",
              i === 5 && "ring-2 ring-focus",
            )}
          >
            {d || <span className="h-5 w-px animate-pulse bg-ink" />}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScaleVignette() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium text-ink">Sleep schedule</p>
        <span className="rounded-full bg-ink px-2 py-0.5 text-micro font-medium text-ink-inverse">Must match</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              "flex h-9 flex-1 items-center justify-center rounded-md text-body-sm font-medium",
              n === 4 ? "bg-ink text-ink-inverse shadow-sm" : "bg-surface text-ink-2 ring-1 ring-line ring-inset",
            )}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-micro text-ink-3">
        <span>Early bird</span>
        <span>Night owl</span>
      </div>
    </div>
  );
}

function IntroVignette() {
  return (
    <div className="flex flex-col items-end gap-2">
      <p className="max-w-[210px] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-body-sm text-ink-inverse">
        Hey Maya! Saw we&apos;re both night owls looking in Tempe — coffee this week?
      </p>
      <span className="flex items-center gap-1 text-micro font-medium text-success">
        <Check className="size-3.5" strokeWidth={2.25} /> Maya accepted · chat open
      </span>
    </div>
  );
}
