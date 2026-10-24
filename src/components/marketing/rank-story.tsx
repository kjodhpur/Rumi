"use client";

import * as React from "react";
import {
  cubicBezier,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Sparkle } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { ScoreRing } from "@/components/ui/score-ring";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { MOCK_MATCHES } from "./mock-data";

/** Where each card lies in the pile: x as % of card width, y px from center, rotation, scale. */
const PILE = [
  { x: -16, y: -168, r: -7, s: 0.95 },
  { x: 24, y: 36, r: 5, s: 0.97 },
  { x: -28, y: 160, r: 3, s: 0.94 },
  { x: 14, y: -70, r: -4, s: 1 },
  { x: -6, y: -250, r: 8, s: 0.93 },
  { x: 28, y: 236, r: -6, s: 0.95 },
];

/** What the same people look like before Rumi: posts in a group chat. */
const POSTS = [
  "“need a room by aug, DM me”",
  "“clean-ish, mostly nocturnal”",
  "“anyone want to split a 2br??”",
  "“looking for a chill roommate!!”",
  "“no drama pls”",
  "“have a cat, is that ok?”",
];

const STEPS = [
  {
    title: "Roommate hunting today is a pile of strangers.",
    body: "Group chats, Facebook posts and spreadsheets. Everyone sounds great until the dishes pile up.",
  },
  {
    title: "Rumi starts with how you actually live.",
    body: "Sleep, cleanliness, guests, noise, budget, neighborhood and move-in date — each weighted by how much it matters to you.",
  },
  {
    title: "Then ranks everyone by how well you’d get along.",
    body: "A score out of 100 for every verified student, the reasons behind it — and your dealbreakers filtered out before you ever see them.",
  },
];

const ease = cubicBezier(0.65, 0, 0.35, 1);

export function RankStory() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const compact = useMediaQuery("(max-width: 767px)");
  const still = hydrated && Boolean(reduce);

  const { scrollYProgress: progress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const [step, setStep] = React.useState(0);
  useMotionValueEvent(progress, "change", (p) => setStep(p < 0.2 ? 0 : p < 0.56 ? 1 : 2));

  // Layout of the finished list, centered in the field: a header row, then one slot per card.
  const rows = compact ? MOCK_MATCHES.slice(0, 5) : MOCK_MATCHES;
  const slot = compact ? 72 : 84;
  const half = compact ? 32 : 36;
  const headerH = 28;
  const headerGap = compact ? 12 : 16;
  const top = (headerGap + headerH - (rows.length - 1) * slot) / 2;
  const headerY = top - half - headerGap - headerH;
  const headerOpacity = useTransform(progress, [0.62, 0.74], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="ranking"
      aria-labelledby="ranking-title"
      className={cn("relative", still ? "py-24" : "h-[300vh] sm:h-[320vh]")}
    >
      <div className={cn("flex flex-col", still ? "" : "sticky top-0 h-dvh overflow-hidden pt-16")}>
        <div className="mx-auto grid h-full w-full max-w-[1200px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-6 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1 md:items-center md:gap-12 lg:py-10">
          <div>
            <p
              className="text-caption font-semibold tracking-wide text-accent-ink uppercase"
              id="ranking-title"
            >
              How Rumi ranks
            </p>
            {/* Mobile: one caption at a time. Desktop: all three, the current one in focus. */}
            <ol
              className={cn(
                "mt-3 md:mt-6 md:flex md:flex-col md:gap-8",
                still ? "flex flex-col gap-6" : "grid",
              )}
            >
              {STEPS.map((item, i) => {
                const current = still || step === i;
                return (
                  <li
                    key={item.title}
                    className={cn(!still && "col-start-1 row-start-1 md:col-auto md:row-auto")}
                    aria-current={!still && step === i ? "step" : undefined}
                  >
                    {/* Inactive titles stay legible (large text, 3:1); descriptions show only for the current step. */}
                    <motion.h2
                      className="font-display text-[28px] !leading-[1.1] text-ink sm:text-display-md lg:text-display-lg"
                      animate={{ opacity: current ? 1 : compact ? 0 : 0.5 }}
                      transition={{ duration: 0.25 }}
                    >
                      {item.title}
                    </motion.h2>
                    <motion.p
                      className="mt-2 max-w-[440px] text-body-sm text-ink-2 sm:text-body"
                      animate={{ opacity: current ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {item.body}
                    </motion.p>
                  </li>
                );
              })}
            </ol>
          </div>

          {still ? (
            <StaticList rows={rows} />
          ) : (
            <div className="relative h-full min-h-[400px]" aria-hidden>
              <motion.div
                className="absolute top-1/2 left-1/2 z-20 flex h-7 w-full max-w-[440px] -translate-x-1/2 items-center px-1"
                style={{ y: headerY, opacity: headerOpacity }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-body-sm font-semibold text-ink">Your top matches</span>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-caption text-ink-2 ring-1 ring-line">
                    Tempe · $800–1,100
                  </span>
                </div>
              </motion.div>
              {rows.map((row, i) => (
                <StoryCard
                  key={row.id}
                  index={i}
                  row={row}
                  post={POSTS[i]}
                  progress={progress}
                  finalY={top + i * slot}
                  compact={compact}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Reduced motion: the finished list, in normal flow, with nothing tied to scroll. */
function StaticList({ rows }: { rows: readonly (typeof MOCK_MATCHES)[number][] }) {
  return (
    <div aria-hidden className="mx-auto flex w-full max-w-[440px] flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-body-sm font-semibold text-ink">Your top matches</span>
        <span className="rounded-full bg-surface px-2.5 py-1 text-caption text-ink-2 ring-1 ring-line">
          Tempe · $800–1,100
        </span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(
            "flex h-[72px] items-center gap-3 rounded-lg bg-surface pr-3 pl-3.5 shadow-md ring-1 ring-line max-sm:h-16",
            i === 0 && "ring-2 ring-accent",
          )}
        >
          <span className="w-4 text-body-sm font-semibold text-ink-3 tabular">{i + 1}</span>
          <Monogram
            name={row.name}
            seed={row.id}
            className="[container-type:size] size-11 shrink-0 max-sm:size-10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-ink">
              {row.name}{" "}
              <span className="font-normal text-ink-3">· {row.meta.split(" · ")[1]}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-caption text-ink-2">
              <Sparkle className="size-3 shrink-0 fill-accent text-accent" strokeWidth={0} />
              <span className="truncate">{row.reasons[0]}</span>
            </p>
          </div>
          <ScoreRing score={row.score} size={44} />
        </div>
      ))}
    </div>
  );
}

function StoryCard({
  index,
  row,
  post,
  progress,
  finalY,
  compact,
}: {
  index: number;
  row: (typeof MOCK_MATCHES)[number];
  post: string;
  progress: MotionValue<number>;
  finalY: number;
  compact: boolean;
}) {
  const pile = PILE[index];
  const k = compact ? 0.62 : 1;
  const a0 = 0.18 + index * 0.045;
  const s0 = 0.56 + index * 0.035;

  const t = useTransform(progress, [a0, a0 + 0.3], [0, 1], { ease });
  const drift = useTransform(progress, [0, 0.18], [36, 0]);
  const x = useTransform(t, (v) => `${pile.x * (1 - v)}%`);
  const y = useTransform([t, drift], ([v, d]: number[]) => (pile.y * k + d) * (1 - v) + finalY * v);
  const rotate = useTransform(t, (v) => pile.r * (1 - v));
  const scale = useTransform(t, (v) => pile.s + (1 - pile.s) * v);
  const postOpacity = useTransform(t, [0.35, 0.7], [1, 0]);
  const reasonOpacity = useTransform(t, [0.5, 0.9], [0, 1]);
  const rankOpacity = useTransform(progress, [a0 + 0.24, a0 + 0.3], [0, 1]);
  const score = useTransform(progress, [s0, s0 + 0.18], [0, row.score], {
    ease: cubicBezier(0.22, 1, 0.36, 1),
  });
  const highlight = useTransform(progress, [0.88, 0.95], [0, index === 0 ? 1 : 0]);

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-full max-w-[440px] -translate-x-1/2"
      style={{ zIndex: 10 - index }}
    >
      <motion.div
        style={{ x, y, rotate, scale }}
        className="-mt-9 max-sm:-mt-8"
      >
        <div className="relative flex h-[72px] items-center gap-3 rounded-lg bg-surface pr-3 pl-3.5 shadow-md ring-1 ring-line max-sm:h-16 max-sm:gap-2.5">
          <motion.span
            className="pointer-events-none absolute -inset-px rounded-lg ring-2 ring-accent"
            style={{ opacity: highlight }}
          />
          <motion.span
            className="w-4 text-body-sm font-semibold text-ink-3 tabular"
            style={{ opacity: rankOpacity }}
          >
            {index + 1}
          </motion.span>
          <Monogram
            name={row.name}
            seed={row.id}
            className="[container-type:size] size-11 shrink-0 max-sm:size-10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-ink">
              {row.name}{" "}
              <span className="font-normal text-ink-3">· {row.meta.split(" · ")[1]}</span>
            </p>
            <div className="relative mt-0.5 h-4">
              <motion.p
                className="absolute inset-0 truncate text-caption text-ink-3"
                style={{ opacity: postOpacity }}
              >
                {post}
              </motion.p>
              <motion.p
                className="absolute inset-0 flex items-center gap-1.5 truncate text-caption text-ink-2"
                style={{ opacity: reasonOpacity }}
              >
                <Sparkle className="size-3 shrink-0 fill-accent text-accent" strokeWidth={0} />
                <span className="truncate">{row.reasons[0]}</span>
              </motion.p>
            </div>
          </div>
          <ProgressRing value={score} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProgressRing({ value }: { value: MotionValue<number> }) {
  const size = 44;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const pathLength = useTransform(value, (v) => Math.max(0.001, v / 100));
  const visible = useTransform(value, (v) => (v < 0.5 ? 0 : 1));
  const rounded = useTransform(value, (v) => (v < 1 ? "–" : String(Math.round(v))));
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center max-sm:size-10">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90">
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
          style={{ pathLength, opacity: visible }}
        />
      </svg>
      <motion.span className="text-[13px] font-semibold tracking-[-0.02em] text-ink tabular">
        {rounded}
      </motion.span>
    </span>
  );
}
