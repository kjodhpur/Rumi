"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronLeft, CloudOff, LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { completeOnboarding } from "@/app/actions/onboarding";
import { signOut } from "@/app/actions/auth";
import type { PhotoRecord } from "@/app/actions/photos";
import { areasSchema, basicsSchema, bioSchema, fieldErrors, housingSchema } from "@/lib/validation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { photoUrl } from "@/lib/photos";
import { useAutosave } from "./use-autosave";
import type { OnboardingData, PrefsDraft, ProfileDraft } from "./types";
import { BasicsStep } from "./steps/basics-step";
import { AboutStep } from "./steps/about-step";
import { HousingStep } from "./steps/housing-step";
import { AreasStep } from "./steps/areas-step";
import { LifestyleStep } from "./steps/lifestyle-step";
import { HabitsStep } from "./steps/habits-step";
import { PrioritiesStep } from "./steps/priorities-step";
import { DealbreakersStep } from "./steps/dealbreakers-step";
import { MusicStep } from "./steps/music-step";
import { PhotoManager } from "./photo-manager";
import { ProfilePreview } from "./profile-preview";
import { FinishScreen } from "./finish-screen";

type StepId =
  | "basics"
  | "photos"
  | "about"
  | "housing"
  | "areas"
  | "lifestyle"
  | "habits"
  | "priorities"
  | "dealbreakers"
  | "music";

interface StepDef {
  id: StepId;
  eyebrow: string;
  title: string;
  subtitle: string;
}

const ALL_STEPS: StepDef[] = [
  { id: "basics", eyebrow: "About you", title: "Let's start with the basics.", subtitle: "Your first name and last initial are all anyone sees." },
  { id: "photos", eyebrow: "Photos", title: "Add a few photos.", subtitle: "Profiles with three or more get noticeably more intros. The first one is your cover." },
  { id: "about", eyebrow: "Bio", title: "Introduce yourself.", subtitle: "A few honest lines about you and how you like to live." },
  { id: "housing", eyebrow: "Housing", title: "What are you looking for?", subtitle: "Budget, timing and the kind of place you want." },
  { id: "areas", eyebrow: "Neighborhoods", title: "Where do you want to live?", subtitle: "Choose every area you'd genuinely consider." },
  { id: "lifestyle", eyebrow: "Lifestyle", title: "How do you live, day to day?", subtitle: "Be honest — it's what makes your matches good." },
  { id: "habits", eyebrow: "Habits", title: "A few habits.", subtitle: "No judgment. It's all about fit." },
  { id: "priorities", eyebrow: "Priorities", title: "What matters most?", subtitle: "Your matches are weighted by what you care about." },
  { id: "dealbreakers", eyebrow: "Dealbreakers", title: "Any dealbreakers?", subtitle: "We'll never show you anyone who breaks these — and they won't see you." },
  { id: "music", eyebrow: "Music", title: "Bring your music.", subtitle: "Connect Spotify to see shared artists. Optional." },
];

export function OnboardingWizard({ data }: { data: OnboardingData }) {
  const router = useRouter();
  const steps = React.useMemo(
    () => ALL_STEPS.filter((s) => s.id !== "music" || data.spotify.enabled),
    [data.spotify.enabled],
  );
  const [index, setIndex] = React.useState(() => Math.min(data.initialStep, steps.length - 1));
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [profile, setProfile] = React.useState<ProfileDraft>(data.profile);
  const [prefs, setPrefs] = React.useState<PrefsDraft>(data.prefs);
  const [photos, setPhotos] = React.useState<PhotoRecord[]>(data.photos);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [finishing, setFinishing] = React.useState(false);
  const [finished, setFinished] = React.useState<{ matches: number } | null>(null);
  const { status, queue, flush } = useAutosave();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Keep ?step= in the URL so browser back/forward walks the steps.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") !== step.id) {
      url.searchParams.set("step", step.id);
      window.history.replaceState(window.history.state, "", url);
    }
  }, [step.id]);

  React.useEffect(() => {
    const onPop = () => {
      const id = new URL(window.location.href).searchParams.get("step");
      const target = steps.findIndex((s) => s.id === id);
      if (target >= 0 && target !== index) {
        setDirection(target > index ? 1 : -1);
        setIndex(target);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [index, steps]);

  const updateProfile = React.useCallback(
    (patch: Partial<ProfileDraft>) => {
      setProfile((p) => ({ ...p, ...patch }));
      setErrors({});
      queue({ profile: patch as Record<string, never> });
    },
    [queue],
  );

  const updatePrefs = React.useCallback(
    (patch: Partial<PrefsDraft>) => {
      setPrefs((p) => ({ ...p, ...patch }));
      setErrors({});
      queue({ prefs: patch as Record<string, never> });
    },
    [queue],
  );

  function validate(id: StepId): Record<string, string> {
    switch (id) {
      case "basics": {
        const r = basicsSchema.safeParse({ ...profile, pronouns: profile.pronouns || undefined });
        return r.success ? {} : fieldErrors(r.error);
      }
      case "photos":
        return photos.length > 0 ? {} : { photos: "Add at least one photo so people know who they're meeting." };
      case "about": {
        const r = bioSchema.safeParse({ bio: profile.bio });
        return r.success ? {} : fieldErrors(r.error);
      }
      case "housing": {
        const r = housingSchema.safeParse(prefs);
        return r.success ? {} : fieldErrors(r.error);
      }
      case "areas": {
        const r = areasSchema.safeParse({ areas: prefs.areas });
        return r.success ? {} : fieldErrors(r.error);
      }
      default:
        return {};
    }
  }

  function goTo(target: number) {
    setDirection(target > index ? 1 : -1);
    setIndex(target);
    setErrors({});
    queue({ step: target });
    const url = new URL(window.location.href);
    url.searchParams.set("step", steps[target].id);
    window.history.pushState(window.history.state, "", url);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });
  }

  async function next() {
    const problems = validate(step.id);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      const first = document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!isLast) {
      goTo(index + 1);
      return;
    }
    setFinishing(true);
    await flush();
    const result = await completeOnboarding();
    setFinishing(false);
    if (!result.ok) {
      toast.error(result.error);
      // Jump back to whichever step the server says is incomplete.
      const target = /photo/i.test(result.error)
        ? "photos"
        : /neighborhood/i.test(result.error)
          ? "areas"
          : /move-in/i.test(result.error)
            ? "housing"
            : /name|year/i.test(result.error)
              ? "basics"
              : null;
      if (target) goTo(steps.findIndex((s) => s.id === target));
      return;
    }
    setFinished({ matches: result.data.matches });
  }

  function back() {
    if (index > 0) goTo(index - 1);
  }

  if (finished) {
    return (
      <FinishScreen
        matches={finished.matches}
        firstName={profile.firstName}
        avatarUrl={photoUrl([...photos].sort((a, b) => a.position - b.position)[0]?.storage_path)}
        onContinue={() => {
          router.replace("/matches");
          router.refresh();
        }}
      />
    );
  }

  const stepProps = { profile, prefs, updateProfile, updatePrefs, errors };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="glass pt-safe sticky top-0 z-30 border-b border-[var(--glass-border)]">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 sm:h-16 sm:px-8">
          <div className="flex w-24 items-center">
            {index > 0 ? (
              <Button variant="ghost" size="icon" onClick={back} aria-label="Previous step" className="-ml-2">
                <ChevronLeft strokeWidth={1.75} />
              </Button>
            ) : (
              <span className="hidden text-ink sm:inline-flex">
                <Wordmark height={20} />
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-caption font-medium text-ink-2 tabular">
              Step {index + 1} of {steps.length}
            </span>
            <ProgressBar value={(index + 1) / steps.length} label="Onboarding progress" className="max-w-[220px]" />
          </div>
          <div className="flex w-24 justify-end">
            <SaveIndicator status={status} />
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="isolate mx-auto grid max-w-[1120px] gap-10 px-4 pt-8 pb-36 sm:px-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-16 lg:pt-14 lg:pb-16">
        {/* Clip the horizontal slide so steps never cause sideways scroll; the
            extra 8px keeps focus rings at the edges visible. */}
        <div className="-mx-2 min-w-0 overflow-x-clip px-2">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 32 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -32, transition: { duration: 0.12 } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
            >
              <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">{step.eyebrow}</p>
              <h1 className="mt-2 font-display text-display-md text-ink sm:text-display-lg">{step.title}</h1>
              <p className="mt-2 mb-8 text-body text-ink-2">{step.subtitle}</p>

              {step.id === "basics" && <BasicsStep {...stepProps} />}
              {step.id === "photos" && (
                <PhotoManager userId={data.userId} photos={photos} onChange={setPhotos} error={errors.photos} />
              )}
              {step.id === "about" && <AboutStep {...stepProps} />}
              {step.id === "housing" && <HousingStep {...stepProps} />}
              {step.id === "areas" && <AreasStep {...stepProps} areas={data.areas} />}
              {step.id === "lifestyle" && <LifestyleStep {...stepProps} />}
              {step.id === "habits" && <HabitsStep {...stepProps} />}
              {step.id === "priorities" && <PrioritiesStep {...stepProps} musicEnabled={data.spotify.connected} />}
              {step.id === "dealbreakers" && <DealbreakersStep {...stepProps} />}
              {step.id === "music" && (
                <MusicStep
                  connected={data.spotify.connected}
                  displayName={data.spotify.displayName}
                  artists={data.spotify.artists}
                  returnTo="/onboarding?step=music"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 hidden items-center justify-between lg:flex">
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-ink-3">
                <LogOut /> Sign out
              </Button>
            </form>
            <Button size="lg" onClick={() => void next()} loading={finishing} className="min-w-[180px]">
              {isLast ? "Finish & see matches" : "Continue"}
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-4 text-caption font-medium text-ink-3">How your card will look</p>
            <ProfilePreview profile={profile} prefs={prefs} photos={photos} areas={data.areas} />
          </div>
        </aside>
      </div>

      {/* Thumb-zone action bar on phones */}
      <div className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glass-border)] lg:hidden">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
          <Button size="lg" block onClick={() => void next()} loading={finishing}>
            {isLast ? "Finish & see matches" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: ReturnType<typeof useAutosave>["status"] }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "idle" ? null : (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-caption font-medium",
            status === "error" ? "text-danger" : "text-ink-3",
          )}
        >
          {status === "saving" ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-ink-3" />
              Saving
            </>
          ) : status === "saved" ? (
            <>
              <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              Saved
            </>
          ) : (
            <>
              {typeof navigator !== "undefined" && !navigator.onLine ? (
                <CloudOff className="size-3.5" strokeWidth={2} aria-hidden />
              ) : (
                <AlertCircle className="size-3.5" strokeWidth={2} aria-hidden />
              )}
              Not saved
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
