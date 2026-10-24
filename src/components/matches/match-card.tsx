"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Bookmark, Music2, Sparkle } from "lucide-react";
import { ScoreRing } from "@/components/ui/score-ring";
import { Monogram } from "@/components/ui/monogram";
import { cn, displayName } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import { imagePlaceholder } from "@/lib/photos";
import { housingLine, metaLine } from "./card-meta";
import type { MatchCardData } from "./types";

/** Photo `sizes` for the card. The profile overlay reuses it to show the already-loaded copy. */
export const CARD_PHOTO_SIZES = "(min-width: 1280px) 330px, (min-width: 640px) 45vw, 100vw";

interface MatchCardProps {
  data: MatchCardData;
  /** Open the profile overlay instead of navigating (when JS is available). */
  onOpen?: (data: MatchCardData) => void;
  onToggleSave?: (data: MatchCardData) => void;
  priority?: boolean;
  /** Hide while the profile overlay owns the shared elements. */
  hidden?: boolean;
  /** Count the score up as the card mounts (marketing mockups). */
  animateScore?: boolean;
  /** Register shared-layout ids for the card → profile morph (off for static mockups). */
  morph?: boolean;
}

export function MatchCard({ data, onOpen, onToggleSave, priority, hidden, animateScore, morph = true }: MatchCardProps) {
  const name = displayName(data.firstName, data.lastInitial);
  const meta = metaLine(data.classYear, data.major);

  return (
    <article
      className={cn(
        "group relative flex flex-col transition-opacity duration-150",
        hidden && "opacity-0",
      )}
      aria-label={`${name}, ${data.score}% match`}
    >
      <Link
        href={`/profile/${data.id}`}
        scroll={false}
        onClick={(event) => {
          if (!onOpen || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onOpen(data);
        }}
        className="absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
      >
        <span className="sr-only">Open {name}&apos;s profile</span>
      </Link>

      <motion.div
        layoutId={morph ? `photo-${data.id}` : undefined}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-sunken shadow-sm"
        style={{ borderRadius: 24 }}
      >
        {data.avatarUrl ? (
          <Image
            src={data.avatarUrl}
            alt=""
            fill
            priority={priority}
            sizes={CARD_PHOTO_SIZES}
            className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.03]"
            placeholder={imagePlaceholder(data.placeholder)}
          />
        ) : (
          <Monogram name={data.firstName} seed={data.id} rounded="rounded-none" className="absolute inset-0 [container-type:size]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      </motion.div>

      <motion.div
        layoutId={morph ? `score-${data.id}` : undefined}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="absolute top-3 left-3 z-20 rounded-full bg-surface p-1 shadow-md"
      >
        <ScoreRing score={data.score} size={44} animateOnMount={animateScore} delay={0.9} />
      </motion.div>

      {onToggleSave ? (
        <SaveButton saved={data.isSaved} name={name} onToggle={() => onToggleSave(data)} />
      ) : null}

      <div className="flex flex-col gap-1 px-1 pt-3.5">
        <div className="flex items-center gap-1.5">
          <motion.h3
            layoutId={morph ? `name-${data.id}` : undefined}
            layout={morph ? "position" : undefined}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="truncate text-title font-semibold text-ink"
          >
            {name}
          </motion.h3>
          {data.verified ? (
            <BadgeCheck className="size-[18px] shrink-0 text-accent" strokeWidth={2} aria-label="Verified student" />
          ) : null}
          {data.introStatus ? (
            <span className="ml-auto shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-micro font-medium text-ink-2">
              {data.introStatus === "accepted" ? "Connected" : "Intro sent"}
            </span>
          ) : null}
        </div>
        {meta ? <p className="truncate text-body-sm text-ink-2">{meta}</p> : null}
        {data.reasons.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {data.reasons.slice(0, 2).map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-body-sm text-ink">
                <Sparkle className="mt-[3px] size-3.5 shrink-0 fill-accent text-accent" strokeWidth={0} aria-hidden />
                <span className="line-clamp-1">{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 flex items-center gap-1.5 truncate text-caption text-ink-3">
          {data.sharedArtists.length > 0 ? (
            <>
              <Music2 className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{data.sharedArtists.slice(0, 2).join(", ")}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span className="truncate">{housingLine(data.budgetMin, data.budgetMax, data.moveInDate, data.areaNames[0])}</span>
        </p>
      </div>
    </article>
  );
}

function SaveButton({ saved, name, onToggle }: { saved: boolean; name: string; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      transition={springSnappy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      className="absolute top-3 right-3 z-20 flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-md outline-none transition-transform focus-visible:ring-2 focus-visible:ring-focus"
    >
      <motion.span
        key={saved ? "saved" : "unsaved"}
        initial={{ scale: saved ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
      >
        <Bookmark className={cn("size-[18px]", saved && "fill-ink")} strokeWidth={2} aria-hidden />
      </motion.span>
    </motion.button>
  );
}
