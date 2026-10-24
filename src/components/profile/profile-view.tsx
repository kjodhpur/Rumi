"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  ShieldOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportSheet } from "@/components/safety/report-sheet";
import { BlockSheet } from "@/components/safety/block-sheet";
import { respondToIntro, toggleSave } from "@/app/actions/social";
import type { MatchCardData } from "@/components/matches/types";
import type { ProfileDetail } from "@/lib/profile";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import { cn, displayName } from "@/lib/utils";
import { useNow } from "@/hooks/use-hydrated";
import { useIsDesktop } from "@/hooks/use-media-query";
import { spring, springSheet } from "@/lib/motion";
import { PhotoCarousel, type CarouselHandle } from "./photo-carousel";
import { IntroSheet } from "./intro-sheet";
import {
  Breakdown,
  HousingFacts,
  LifestyleFacts,
  MusicFacts,
  Reasons,
  SectionTitle,
  lastActiveLabel,
} from "./profile-sections";

interface ProfileViewProps {
  id: string;
  preview?: MatchCardData | null;
  detail?: ProfileDetail | null;
  mode: "overlay" | "page";
  onClose?: () => void;
  /** Called after a block, so lists can drop the card. */
  onRemoved?: (id: string) => void;
  /** Called when saved state changes, so lists stay in sync. */
  onSavedChange?: (id: string, saved: boolean) => void;
  carouselRef?: React.Ref<CarouselHandle>;
  /** `sizes` the first photo is already loaded at in the list it was opened from. */
  coverSizes?: string;
}

export function ProfileView({
  id,
  preview,
  detail,
  mode,
  onClose,
  onRemoved,
  onSavedChange,
  carouselRef,
  coverSizes,
}: ProfileViewProps) {
  const router = useRouter();
  const loading = detail === undefined;
  const firstName = detail?.firstName ?? preview?.firstName ?? "";
  const lastInitial = detail?.lastInitial ?? preview?.lastInitial ?? "";
  const name = displayName(firstName, lastInitial);
  const score = detail?.match?.score ?? preview?.score ?? null;
  const reasons = detail?.match?.reasons ?? preview?.reasons ?? [];
  const watchouts = detail?.match?.watchouts ?? preview?.watchouts ?? [];
  const verified = detail?.verified ?? preview?.verified ?? false;
  const classYear = detail?.classYear ?? preview?.classYear ?? null;
  const major = detail?.major ?? preview?.major ?? null;
  const photos =
    detail?.photos ??
    (preview?.avatarUrl ? [{ id: "cover", url: preview.avatarUrl, placeholder: preview.placeholder }] : []);
  const isSelf = detail?.isSelf ?? false;

  const [saved, setSaved] = React.useState(preview?.isSaved ?? false);
  const [intro, setIntro] = React.useState<ProfileDetail["intro"]>(null);
  const [introOpen, setIntroOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [responding, setResponding] = React.useState<"accept" | "decline" | null>(null);

  React.useEffect(() => {
    if (detail) {
      setSaved(detail.isSaved);
      setIntro(detail.intro);
    }
  }, [detail]);

  async function onToggleSave() {
    const next = !saved;
    setSaved(next);
    onSavedChange?.(id, next);
    const result = await toggleSave(id, next);
    if (!result.ok) {
      setSaved(!next);
      onSavedChange?.(id, !next);
      toast.error(result.error);
    } else if (next) {
      toast.success(`Saved ${firstName}`, { description: "Find them under Saved on Matches." });
    }
  }

  async function respond(accept: boolean) {
    if (!intro) return;
    setResponding(accept ? "accept" : "decline");
    const result = await respondToIntro(intro.id, accept);
    setResponding(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (accept && result.data.conversationId) {
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      setIntro({ ...intro, status: "declined" });
    }
  }

  const meta = [labelOf(CLASS_YEARS, classYear), major, detail?.pronouns].filter(Boolean).join(" · ");
  const now = useNow();
  const active = detail && now ? lastActiveLabel(detail.lastActiveAt, now) : null;
  const isOverlay = mode === "overlay";
  // On phones the name flies in from the card. In the desktop overlay its path would be
  // clipped by the scrolling details column, so there it fades in with the column instead.
  const wide = useIsDesktop();
  const nameMorphs = !isOverlay || !wide;
  // Overlay entrance. When the name morphs, its column can't fade, so the other parts do.
  const enter = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring, delay: 0.08 },
  };
  const partEnter = isOverlay && nameMorphs ? enter : undefined;
  // The name rises through the meta line's spot, so that line waits for it to pass.
  const metaEnter = partEnter ? { ...partEnter, transition: { ...spring, delay: 0.2 } } : undefined;

  const topActions = (
    <motion.div
      initial={isOverlay ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.2, delay: isOverlay ? 0.15 : 0 }}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 pt-[max(env(safe-area-inset-top),12px)] md:p-4"
    >
      <div className="pointer-events-auto">
        {isOverlay ? (
          <RoundButton label="Close profile" onClick={onClose}>
            <span className="md:hidden">
              <ChevronLeft className="size-5" strokeWidth={2} />
            </span>
            <span className="hidden md:inline">
              <X className="size-5" strokeWidth={2} />
            </span>
          </RoundButton>
        ) : (
          <RoundButton
            label="Back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/matches"))}
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </RoundButton>
        )}
      </div>
      {!isSelf ? (
        <div className="pointer-events-auto flex gap-2">
          <RoundButton label={saved ? `Remove ${firstName} from saved` : `Save ${firstName}`} onClick={() => void onToggleSave()} pressed={saved}>
            <motion.span key={String(saved)} initial={{ scale: saved ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
              <Bookmark className={cn("size-[18px]", saved && "fill-current")} strokeWidth={2} />
            </motion.span>
          </RoundButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-md outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
              >
                <MoreHorizontal className="size-5" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                <Flag /> Report {firstName}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => setBlockOpen(true)}>
                <ShieldOff /> Block {firstName}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </motion.div>
  );

  const actionBar =
    !isSelf && detail !== null ? (
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0, transition: { duration: 0.12 } }}
        transition={{ ...spring, delay: 0.15 }}
        className={cn(
          "z-30 flex gap-3 border-t border-line bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]",
          isOverlay
            ? "fixed inset-x-0 bottom-0 md:sticky md:-mx-8 md:mt-10 md:px-8 md:pb-4"
            : "fixed inset-x-0 bottom-0 md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 lg:left-[248px]",
        )}
      >
        <PrimaryAction
          intro={intro}
          loading={loading}
          firstName={firstName}
          responding={responding}
          onIntro={() => setIntroOpen(true)}
          onRespond={(accept) => void respond(accept)}
        />
      </motion.div>
    ) : null;

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <motion.h1
            layoutId={nameMorphs ? `name-${id}` : undefined}
            layout={nameMorphs ? "position" : undefined}
            transition={springSheet}
            className="font-display text-display-md text-ink md:text-display-lg"
          >
            {name || "\u00a0"}
          </motion.h1>
          {verified ? (
            <motion.span {...partEnter} className="shrink-0">
              <BadgeCheck className="size-6 text-accent" strokeWidth={2} aria-label="Verified student" />
            </motion.span>
          ) : null}
        </div>
        <motion.div {...metaEnter}>
          {meta ? <p className="mt-1 text-body text-ink-2">{meta}</p> : null}
          {active ? (
            <p className="mt-1 flex items-center gap-1.5 text-caption text-ink-3">
              {active === "Active now" ? <span className="size-1.5 rounded-full bg-success" /> : null}
              {active}
            </p>
          ) : null}
        </motion.div>
      </div>
      {score !== null && !isSelf ? (
        <motion.div {...partEnter} className="shrink-0">
          <ScoreRing score={score} size={104} variant="hero" animateOnMount delay={0.25} />
        </motion.div>
      ) : null}
    </div>
  );

  const body = (
    <>
      {isSelf ? (
        <div className="mt-6 flex flex-wrap gap-2 rounded-lg bg-surface-sunken p-4 text-body-sm text-ink-2">
          This is how other students see your profile.
          <Link href="/settings/profile" className="inline-flex items-center gap-1 font-medium text-ink underline underline-offset-4">
            <Pencil className="size-3.5" strokeWidth={2} /> Edit profile
          </Link>
        </div>
      ) : null}

      {!isSelf && (reasons.length > 0 || watchouts.length > 0) ? (
        <section className="mt-8" aria-labelledby={`why-${id}`}>
          <SectionTitle>
            <span id={`why-${id}`}>Why you match</span>
          </SectionTitle>
          <Reasons reasons={reasons} watchouts={watchouts} />
        </section>
      ) : null}

      {loading ? (
        <DetailSkeleton />
      ) : detail ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {detail.bio ? (
            <section className="mt-10">
              <SectionTitle>About</SectionTitle>
              <p className="text-body whitespace-pre-line text-ink">{detail.bio}</p>
            </section>
          ) : null}

          {detail.match && detail.match.breakdown.length > 0 ? (
            <section className="mt-10">
              <SectionTitle>Compatibility breakdown</SectionTitle>
              <Breakdown items={detail.match.breakdown} />
            </section>
          ) : null}

          {detail.music ? (
            <section className="mt-10">
              <SectionTitle>{detail.match?.sharedArtists.length ? "Shared music" : "Music"}</SectionTitle>
              <MusicFacts music={detail.music} shared={detail.match?.sharedArtists ?? []} />
            </section>
          ) : null}

          {detail.prefs ? (
            <>
              <section className="mt-10">
                <SectionTitle>Looking for</SectionTitle>
                <HousingFacts prefs={detail.prefs} />
              </section>
              <section className="mt-10">
                <SectionTitle>Lifestyle</SectionTitle>
                <LifestyleFacts prefs={detail.prefs} />
              </section>
            </>
          ) : null}

          {!isSelf ? (
            <p className="mt-10 text-caption text-ink-3">
              Never send money or deposits before you&apos;ve met and toured a place in person.{" "}
              <button type="button" onClick={() => setReportOpen(true)} className="underline underline-offset-2 hover:text-ink-2">
                Report a problem
              </button>
            </p>
          ) : null}
        </motion.div>
      ) : (
        <p className="mt-10 text-body-sm text-ink-2">This profile isn&apos;t available anymore.</p>
      )}
    </>
  );

  const sheets = (
    <>
      <IntroSheet
        open={introOpen}
        onOpenChange={setIntroOpen}
        recipientId={id}
        firstName={firstName}
        topReason={reasons[0]}
        onSent={() => setIntro({ id: "pending", status: "pending", direction: "sent", conversationId: null })}
      />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} reportedId={id} firstName={firstName} />
      <BlockSheet
        open={blockOpen}
        onOpenChange={setBlockOpen}
        userId={id}
        firstName={firstName}
        onBlocked={() => {
          onRemoved?.(id);
          if (isOverlay) onClose?.();
          else router.replace("/matches");
        }}
      />
    </>
  );

  if (isOverlay) {
    // Phone: one full-screen scroll. Desktop: the 4:5 photo sets the dialog's
    // height; details scroll on the right without stretching it.
    return (
      <div className="relative md:grid md:grid-cols-[minmax(0,46%)_minmax(0,1fr)]">
        <div className="relative md:p-4 md:pr-0">
          {topActions}
          <PhotoCarousel
            ref={carouselRef}
            id={id}
            name={firstName || "Profile"}
            photos={photos}
            rounded={0}
            className="md:rounded-[20px]"
            sizes="(min-width: 768px) 460px, 100vw"
            coverSizes={coverSizes}
            priority
          />
        </div>
        <div className="relative min-w-0">
          <motion.div
            initial={nameMorphs ? false : enter.initial}
            animate={enter.animate}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={enter.transition}
            className="flex min-h-0 flex-col px-5 pt-6 pb-28 md:absolute md:inset-0 md:overflow-y-auto md:overscroll-contain md:px-8 md:pt-8 md:pb-0"
          >
            {header}
            <motion.div {...partEnter}>{body}</motion.div>
            <div className="hidden flex-1 md:block" />
            {actionBar}
          </motion.div>
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div className="relative md:grid md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:gap-10 lg:gap-14">
      <div className="relative md:sticky md:top-10 md:self-start">
        {topActions}
        <PhotoCarousel
          ref={carouselRef}
          id={id}
          name={firstName || "Profile"}
          photos={photos}
          rounded={24}
          className="-mx-4 sm:mx-0"
          sizes="(min-width: 768px) 420px, 100vw"
          priority
        />
      </div>
      <div className="min-w-0 pt-6 pb-32 md:pt-0 md:pb-16">
        {header}
        {actionBar}
        {body}
      </div>
      {sheets}
    </div>
  );
}

function PrimaryAction({
  intro,
  loading,
  firstName,
  responding,
  onIntro,
  onRespond,
}: {
  intro: ProfileDetail["intro"];
  loading: boolean;
  firstName: string;
  responding: "accept" | "decline" | null;
  onIntro: () => void;
  onRespond: (accept: boolean) => void;
}) {
  if (intro?.status === "accepted" && intro.conversationId) {
    return (
      <Button asChild size="lg" className="flex-1 md:flex-none md:px-8">
        <Link href={`/messages/${intro.conversationId}`}>
          <MessageCircle /> Message {firstName}
        </Link>
      </Button>
    );
  }
  if (intro?.status === "pending" && intro.direction === "received") {
    return (
      <>
        <Button variant="secondary" size="lg" className="flex-1 md:flex-none" onClick={() => onRespond(false)} loading={responding === "decline"} disabled={responding !== null}>
          Pass
        </Button>
        <Button size="lg" className="flex-[2] md:flex-none md:px-8" onClick={() => onRespond(true)} loading={responding === "accept"} disabled={responding !== null}>
          Accept intro
        </Button>
      </>
    );
  }
  if (intro?.status === "pending") {
    return (
      <Button size="lg" variant="secondary" className="flex-1 md:flex-none md:px-8" disabled>
        Intro sent · waiting for {firstName}
      </Button>
    );
  }
  return (
    <Button size="lg" className="flex-1 md:flex-none md:px-8" onClick={onIntro} disabled={loading}>
      <Send /> Send intro
    </Button>
  );
}

function RoundButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-md outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-10 flex flex-col gap-10" aria-label="Loading profile">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
