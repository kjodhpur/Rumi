"use client";

import * as React from "react";
import { motion } from "motion/react";
import { parseISO, format } from "date-fns";
import { AlertTriangle, CalendarDays, Home, MapPin, Music2, Repeat, Sparkle, Wallet } from "lucide-react";
import {
  DRINKING,
  HOUSING_TYPES,
  IMPORTANCE,
  LEASE_LENGTHS,
  PETS,
  SCALES,
  SMOKING,
  STUDY,
  labelOf,
} from "@/lib/options";
import { formatBudget } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { ProfileDetail } from "@/lib/profile";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-caption font-semibold tracking-wide text-ink-3 uppercase">{children}</h2>;
}

export function Reasons({ reasons, watchouts }: { reasons: string[]; watchouts: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {reasons.map((reason, i) => (
        <motion.p
          key={reason}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.35 + i * 0.03 }}
          className="flex items-start gap-3 text-body text-ink"
        >
          <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Sparkle className="size-3 fill-accent text-accent" strokeWidth={0} aria-hidden />
          </span>
          {reason}
        </motion.p>
      ))}
      {watchouts.map((w, i) => (
        <motion.p
          key={w}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.35 + (reasons.length + i) * 0.03 }}
          className="flex items-start gap-3 text-body text-ink-2"
        >
          <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <AlertTriangle className="size-3 text-warning" strokeWidth={2.25} aria-hidden />
          </span>
          <span>
            <span className="sr-only">Worth talking about: </span>
            {w}
          </span>
        </motion.p>
      ))}
    </div>
  );
}

/** Per-factor bars. Bars grow with scaleX (transform only) as they scroll into view. */
export function Breakdown({ items }: { items: NonNullable<ProfileDetail["match"]>["breakdown"] }) {
  const visible = items.filter((item) => item.importance > 0);
  return (
    <motion.ul
      className="flex flex-col gap-3.5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ show: { transition: { staggerChildren: 0.03 } } }}
    >
      {visible.map((item) => {
        const pct = Math.round(item.similarity * 100);
        return (
          <li key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-2 text-body-sm text-ink">
              {item.label}
              {item.importance === 3 ? (
                <span className="rounded-full bg-surface-sunken px-1.5 py-px text-micro font-medium text-ink-2">
                  {IMPORTANCE[3].short}
                </span>
              ) : null}
            </span>
            <span className="text-body-sm font-medium text-ink-2 tabular">{pct}%</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
              <motion.span
                className="block h-full origin-left rounded-full bg-ink"
                variants={{ hidden: { scaleX: 0 }, show: { scaleX: Math.max(0.02, item.similarity), transition: spring } }}
                style={{ opacity: 0.35 + item.similarity * 0.65 }}
              />
            </span>
          </li>
        );
      })}
    </motion.ul>
  );
}

export function HousingFacts({ prefs }: { prefs: NonNullable<ProfileDetail["prefs"]> }) {
  const facts = [
    { icon: Wallet, label: "Budget", value: `${formatBudget(prefs.budgetMin, prefs.budgetMax)}/mo` },
    {
      icon: CalendarDays,
      label: "Move-in",
      value: prefs.moveInDate ? format(parseISO(prefs.moveInDate), "MMM d, yyyy") : "Flexible",
    },
    { icon: Repeat, label: "Lease", value: labelOf(LEASE_LENGTHS, prefs.leaseLength) },
    { icon: Home, label: "Housing", value: labelOf(HOUSING_TYPES, prefs.housingType) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line ring-1 ring-line">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-surface p-4">
            <dt className="flex items-center gap-1.5 text-caption text-ink-3">
              <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              {label}
            </dt>
            <dd className="mt-1 text-body-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {prefs.areaNames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {prefs.areaNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1.5 text-body-sm text-ink-2">
              <MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
              {name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LifestyleFacts({ prefs }: { prefs: NonNullable<ProfileDetail["prefs"]> }) {
  const rows = [
    { label: SCALES.sleep_schedule.label, value: SCALES.sleep_schedule.steps[prefs.sleepSchedule - 1] },
    { label: SCALES.cleanliness.label, value: SCALES.cleanliness.steps[prefs.cleanliness - 1] },
    { label: SCALES.noise.label, value: SCALES.noise.steps[prefs.noise - 1] },
    { label: SCALES.guests.label, value: SCALES.guests.steps[prefs.guests - 1] },
    { label: "Smoking", value: labelOf(SMOKING, prefs.smoking) },
    { label: "Drinking", value: labelOf(DRINKING, prefs.drinking) },
    { label: "Pets", value: labelOf(PETS, prefs.pets) },
    { label: "Studies", value: labelOf(STUDY, prefs.study) },
  ];
  return (
    <dl className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="shrink-0 text-body-sm text-ink-3">{row.label}</dt>
          <dd className="text-right text-body-sm text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MusicFacts({ music, shared }: { music: NonNullable<ProfileDetail["music"]>; shared: string[] }) {
  const sharedSet = new Set(shared);
  return (
    <div className="flex flex-col gap-4">
      {shared.length > 0 ? (
        <p className="flex items-center gap-2 text-body-sm text-ink">
          <Music2 className="size-4 text-accent" strokeWidth={2} aria-hidden />
          You share {shared.length} {shared.length === 1 ? "artist" : "artists"}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-1.5">
        {music.artists.slice(0, 12).map((artist) => (
          <li
            key={artist.id}
            className={
              sharedSet.has(artist.name)
                ? "rounded-full bg-ink px-3 py-1.5 text-body-sm font-medium text-ink-inverse"
                : "rounded-full bg-surface-sunken px-3 py-1.5 text-body-sm text-ink-2"
            }
          >
            {artist.name}
          </li>
        ))}
      </ul>
      {music.genres.length > 0 ? (
        <p className="text-body-sm text-ink-3">Into {music.genres.slice(0, 5).join(", ")}</p>
      ) : null}
    </div>
  );
}

export function lastActiveLabel(iso: string, now: number) {
  const diff = now - Date.parse(iso);
  if (diff < 15 * 60_000) return "Active now";
  if (diff < 24 * 3_600_000) return "Active today";
  if (diff < 7 * 86_400_000) return `Active ${Math.round(diff / 86_400_000)}d ago`;
  return null;
}
