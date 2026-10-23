"use client";

import { motion } from "motion/react";
import { MessageCircle, Sparkle, Users } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { ScoreRing } from "@/components/ui/score-ring";
import { SpotifyMark } from "@/components/brand/spotify-mark";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Eyebrow, SectionTitle } from "./section-heading";

export function Features() {
  return (
    <section aria-labelledby="features-title" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="max-w-[640px]">
          <Eyebrow>Beyond the list</Eyebrow>
          <SectionTitle id="features-title">Everything between “hi” and move-in day.</SectionTitle>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <Tile className="lg:col-span-4" title="Chat once you both say yes" body="Real-time messages with typing and read receipts. Safety tools are always one tap away.">
            <ChatDemo />
          </Tile>
          <Tile className="lg:col-span-2" title="Match as a group" body="Need a 3- or 4-bedroom? Team up and see how everyone fits together.">
            <GroupDemo />
          </Tile>
          <Tile className="lg:col-span-2" title="Shared music, if you want" body="Connect Spotify to show your top artists and find the people who share them.">
            <MusicDemo />
          </Tile>
          <Tile className="lg:col-span-4" title="Hear about great matches first" body="When someone who fits you really well joins, you'll know — in the app, or in one calm daily email.">
            <NotificationsDemo />
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ title, body, children, className }: { title: string; body: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line", className)}>
      <div aria-hidden className="relative flex min-h-[240px] flex-1 items-center justify-center bg-surface-sunken/70 p-6 sm:p-8">
        {children}
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="text-title text-ink">{title}</h3>
        <p className="mt-1 text-body-sm text-ink-2">{body}</p>
      </div>
    </article>
  );
}

const pop = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

function ChatDemo() {
  return (
    <motion.div
      className="flex w-full max-w-[440px] flex-col gap-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      variants={{ show: { transition: { staggerChildren: 0.28, delayChildren: 0.1 } } }}
    >
      <motion.p variants={pop} className="w-fit max-w-[78%] origin-bottom-left rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-body-sm text-ink shadow-xs ring-1 ring-line">
        The place on Apache has an in-unit washer. Want to tour it Saturday?
      </motion.p>
      <motion.p variants={pop} className="ml-auto w-fit max-w-[78%] origin-bottom-right rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-body-sm text-ink-inverse">
        Yes!! 11am works. I&apos;ll bring the list of questions for the landlord
      </motion.p>
      <motion.span variants={pop} className="ml-auto text-micro font-medium text-ink-3">
        Seen
      </motion.span>
      <motion.div variants={pop} className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 shadow-xs ring-1 ring-line">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function GroupDemo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        className="flex items-center"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {["Maya", "Priya", "Ava"].map((name, i) => (
          <motion.span
            key={name}
            variants={{ hidden: { x: (1 - i) * 18, opacity: 0 }, show: { x: 0, opacity: 1, transition: spring } }}
            className="-ml-3 rounded-full ring-4 ring-surface-sunken first:ml-0"
          >
            <Monogram name={name} seed={`group-${name}`} className="size-14 [container-type:size]" />
          </motion.span>
        ))}
        <span className="-ml-3 flex size-14 items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-surface-sunken text-caption font-medium text-ink-3 ring-4 ring-surface-sunken">
          +1
        </span>
      </motion.div>
      <div className="flex items-center gap-3 rounded-full bg-surface py-1.5 pr-4 pl-1.5 shadow-sm ring-1 ring-line">
        <ScoreRing score={87} size={36} />
        <span className="text-body-sm font-medium text-ink">Combined fit</span>
      </div>
    </div>
  );
}

function MusicDemo() {
  return (
    <div className="flex w-full max-w-[260px] flex-col gap-3">
      <div className="flex items-center gap-2 text-body-sm font-medium text-ink">
        <SpotifyMark className="size-5 text-[#1DB954]" /> 4 artists in common
      </div>
      <motion.div
        className="flex flex-wrap gap-1.5"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
      >
        {["Phoebe Bridgers", "SZA", "Bon Iver", "Mitski"].map((artist) => (
          <motion.span key={artist} variants={pop} className="rounded-full bg-surface px-3 py-1.5 text-body-sm text-ink shadow-xs ring-1 ring-line">
            {artist}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function NotificationsDemo() {
  const rows = [
    { icon: Sparkle, tone: "accent", title: "New 92% match: Priya S.", body: "Quiet, studies at home, 12-month lease", time: "2m" },
    { icon: MessageCircle, tone: "ink", title: "Jordan accepted your intro", body: "Say hi — your chat is open", time: "1h" },
    { icon: Users, tone: "ink", title: "Diego invited you to “Tempe 4BR”", body: "Combined fit 84 with the group", time: "3h" },
  ] as const;
  return (
    <motion.ul
      className="flex w-full max-w-[460px] flex-col gap-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      variants={{ show: { transition: { staggerChildren: 0.03 } } }}
    >
      {rows.map(({ icon: Icon, tone, title, body, time }) => (
        <motion.li key={title} variants={pop} className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-xs ring-1 ring-line">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              tone === "accent" ? "bg-accent-soft text-accent" : "bg-surface-sunken text-ink-2",
            )}
          >
            <Icon className={cn("size-[18px]", tone === "accent" && "fill-accent")} strokeWidth={tone === "accent" ? 0 : 1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-medium text-ink">{title}</span>
            <span className="block truncate text-caption text-ink-3">{body}</span>
          </span>
          <span className="text-caption text-ink-3">{time}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
