"use client";

import * as React from "react";
import { useInView } from "motion/react";
import { ArrowLeftRight, Ban, SlidersHorizontal } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { ScoreRing } from "@/components/ui/score-ring";
import { Breakdown, Reasons, SectionTitle as CardSectionTitle } from "@/components/profile/profile-sections";
import { MOCK_BREAKDOWN } from "./mock-data";
import { Eyebrow, SectionTitle } from "./section-heading";

const POINTS = [
  {
    icon: SlidersHorizontal,
    title: "Weighted by what matters to you",
    body: "Say cleanliness is a must and guests don't matter much — your ranking follows, factor by factor.",
  },
  {
    icon: Ban,
    title: "Dealbreakers never show up",
    body: "Mark smoking, pets, budget or area as a dealbreaker and those students are filtered out entirely.",
  },
  {
    icon: ArrowLeftRight,
    title: "Compatibility goes both ways",
    body: "A 94 means you fit what they're looking for too — not just what you want from them.",
  },
];

export function WhyYouMatch() {
  return (
    <section id="why" aria-labelledby="why-title" className="py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-4 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <Eyebrow>Why you match</Eyebrow>
          <SectionTitle id="why-title">Every score shows its work.</SectionTitle>
          <p className="mt-5 max-w-[500px] text-body text-ink-2 sm:text-title sm:font-normal">
            No black box. Each match comes with the reasons you&apos;d get along, what&apos;s worth talking about first,
            and how every part of your day-to-day lines up.
          </p>
          <ul className="mt-10 flex flex-col gap-7">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-ink shadow-xs ring-1 ring-line">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="text-title text-ink">{title}</h3>
                  <p className="mt-1 max-w-[440px] text-body-sm text-ink-2 sm:text-body">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <ProfileDemo />
      </div>
    </section>
  );
}

/** The profile view's own sections, filled with a sample match. */
function ProfileDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -25% 0px" });
  return (
    <div ref={ref} aria-hidden className="relative">
      <div className="absolute inset-x-6 -bottom-4 top-6 rounded-2xl bg-surface-sunken ring-1 ring-line sm:inset-x-10" />
      <div className="relative rounded-2xl bg-surface p-5 shadow-lg ring-1 ring-line sm:p-8">
        <div className="flex items-center gap-4">
          <Monogram name="Jordan" seed="mock-jordan" className="size-14 shrink-0 [container-type:size] sm:size-16" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-display-sm text-ink">Jordan K.</p>
            <p className="truncate text-body-sm text-ink-2">Sophomore · Computer Science</p>
          </div>
          <ScoreRing key={inView ? "in" : "out"} score={89} size={96} variant="hero" animateOnMount={inView} className="max-sm:hidden" />
          <ScoreRing key={inView ? "in-s" : "out-s"} score={89} size={52} animateOnMount={inView} className="sm:hidden" />
        </div>
        <div className="mt-7">
          <CardSectionTitle>Why you&apos;d get along</CardSectionTitle>
          <Reasons
            key={inView ? "in" : "out"}
            reasons={["You both keep things spotless", "Moving in the same week", "Smoke-free, both of you"]}
            watchouts={["Jordan has friends over most weekends — worth a chat"]}
          />
        </div>
        <div className="mt-8">
          <CardSectionTitle>How you line up</CardSectionTitle>
          <Breakdown items={MOCK_BREAKDOWN} />
        </div>
      </div>
    </div>
  );
}
