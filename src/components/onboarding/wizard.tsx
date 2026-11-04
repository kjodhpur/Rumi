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
import { SharingStep } from "./steps/sharing-step";
import { SchoolStep, hasSchoolOptions } from "./steps/school-step";
import { QuestionsStep } from "./steps/questions-step";
import { ConsistencyPrompt, consistencyInput } from "@/components/matching/consistency-prompt";
import { PhotoManager } from "./photo-manager";
import { ProfilePreview } from "./profile-preview";
import { FinishScreen } from "./finish-screen";
import { useLocalizeError, useT } from "@/components/providers/i18n";

type StepId =
  | "basics"
  | "school"
  | "questions"
  | "photos"
  | "about"
  | "housing"
  | "areas"
  | "lifestyle"
  | "habits"
  | "priorities"
  | "dealbreakers"
  | "music"
  | "sharing";

const ALL_STEPS: StepId[] = [
  "basics",
  "school",
  "photos",
  "about",
  "housing",
  "areas",
  "lifestyle",
  "habits",
  "priorities",
  "questions",
  "dealbreakers",
  "music",
  "sharing",
];

export function OnboardingWizard({ data }: { data: OnboardingData }) {
  const router = useRouter();
  const t = useT("onboarding");
  const localizeError = useLocalizeError();
  const steps = React.useMemo(
    () =>
      ALL_STEPS.filter(
        (id) =>
          (id !== "music" || data.spotify.enabled) &&
          (id !== "sharing" || Boolean(data.sharing.office)) &&
          (id !== "school" || hasSchoolOptions(data.school)) &&
          (id !== "questions" || data.school.required.length > 0),
      ).map((id) => ({
        id,
        eyebrow: t(`steps.${id}.eyebrow`),
        title: t(`steps.${id}.title`, { office: data.sharing.office ?? "" }),
        subtitle: t(`steps.${id}.subtitle`),
      })),
    [data.spotify.enabled, data.sharing.office, data.school, t],
  );
  const [index, setIndex] = React.useState(() => {
    // ?step= names a step (reloads, back/forward); otherwise resume where they left off.
    const named = steps.findIndex((s) => s.id === data.initialStepId);
    return named >= 0 ? named : Math.min(data.initialStep, steps.length - 1);
  });
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [profile, setProfile] = React.useState<ProfileDraft>(data.profile);
  const [prefs, setPrefs] = React.useState<PrefsDraft>(data.prefs);
  const [photos, setPhotos] = React.useState<PhotoRecord[]>(data.photos);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [schoolAnswers, setSchoolAnswers] = React.useState<Record<string, string>>(
    data.school.answers,
  );
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

  const localized = (errs: Record<string, string>) =>
    Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, localizeError(v)]));

  function validate(id: StepId): Record<string, string> {
    switch (id) {
      case "basics": {
        const r = basicsSchema.safeParse({ ...profile, pronouns: profile.pronouns || undefined });
        return r.success ? {} : localized(fieldErrors(r.error));
      }
      case "questions":
        return data.school.required.every((q) => schoolAnswers[q.key])
          ? {}
          : { questions: t("answerEach") };
      case "photos":
        return photos.length > 0 ? {} : { photos: t("needPhoto") };
      case "about": {
        const r = bioSchema.safeParse({ bio: profile.bio });
        return r.success ? {} : localized(fieldErrors(r.error));
      }
      case "housing": {
        const r = housingSchema.safeParse(prefs);
        return r.success ? {} : localized(fieldErrors(r.error));
      }
      case "areas": {
        const r = areasSchema.safeParse({ areas: prefs.areas });
        return r.success ? {} : localized(fieldErrors(r.error));
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
      const target = steps.findIndex((s) => s.id === result.fieldErrors?.step);
      if (target >= 0) goTo(target);
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
      <header className="glass sticky top-0 z-30 border-b border-[var(--glass-border)] pt-safe">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 sm:h-16 sm:px-8">
          <div className="flex w-24 items-center">
            {index > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={back}
                aria-label={t("previous")}
                className="-ml-2"
              >
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
              {t("stepOf", { step: index + 1, total: steps.length })}
            </span>
            <ProgressBar
              value={(index + 1) / steps.length}
              label={t("progress")}
              className="max-w-[220px]"
            />
          </div>
          <div className="flex w-24 justify-end">
            <SaveIndicator status={status} />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="isolate mx-auto grid max-w-[1120px] gap-10 px-4 pt-8 pb-36 sm:px-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-16 lg:pt-14 lg:pb-16"
      >
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
              <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">
                {step.eyebrow}
              </p>
              <h1 className="mt-2 font-display text-display-md text-ink sm:text-display-lg">
                {step.title}
              </h1>
              <p className="mt-2 mb-8 text-body text-ink-2">{step.subtitle}</p>

              {step.id === "basics" && (
                <BasicsStep {...stepProps} trackLocked={data.school.trackLocked} />
              )}
              {step.id === "school" && <SchoolStep {...stepProps} school={data.school} />}
              {step.id === "questions" && (
                <QuestionsStep
                  school={data.school}
                  onAnswersChange={setSchoolAnswers}
                  error={errors.questions}
                />
              )}
              {step.id === "photos" && (
                <PhotoManager
                  userId={data.userId}
                  photos={photos}
                  onChange={setPhotos}
                  error={errors.photos}
                />
              )}
              {step.id === "about" && <AboutStep {...stepProps} />}
              {step.id === "housing" && <HousingStep {...stepProps} />}
              {step.id === "areas" && <AreasStep {...stepProps} areas={data.areas} />}
              {step.id === "lifestyle" && <LifestyleStep {...stepProps} />}
              {step.id === "habits" && <HabitsStep {...stepProps} />}
              {step.id === "priorities" && (
                <PrioritiesStep {...stepProps} musicEnabled={data.spotify.connected} />
              )}
              {(step.id === "lifestyle" || step.id === "habits" || step.id === "priorities") && (
                <div className="mt-8">
                  <ConsistencyPrompt
                    input={consistencyInput(prefs)}
                    dismissed={data.dismissedFlags}
                  />
                </div>
              )}
              {step.id === "dealbreakers" && <DealbreakersStep {...stepProps} />}
              {step.id === "music" && (
                <MusicStep
                  connected={data.spotify.connected}
                  displayName={data.spotify.displayName}
                  artists={data.spotify.artists}
                  returnTo="/onboarding?step=music"
                />
              )}
              {step.id === "sharing" && data.sharing.office ? (
                <SharingStep office={data.sharing.office} initialGranted={data.sharing.granted} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 hidden items-center justify-between lg:flex">
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-ink-3">
                <LogOut /> {t("signOut")}
              </Button>
            </form>
            <Button
              size="lg"
              onClick={() => void next()}
              loading={finishing}
              className="min-w-[180px]"
            >
              {isLast ? t("finishButton") : t("continue")}
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-4 text-caption font-medium text-ink-3">{t("preview")}</p>
            <ProfilePreview profile={profile} prefs={prefs} photos={photos} areas={data.areas} />
          </div>
        </aside>
      </div>

      {/* Thumb-zone action bar on phones */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glass-border)] pb-safe lg:hidden">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
          <Button size="lg" block onClick={() => void next()} loading={finishing}>
            {isLast ? t("finishButton") : t("continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: ReturnType<typeof useAutosave>["status"] }) {
  const t = useT("onboarding");
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
              {t("saving")}
            </>
          ) : status === "saved" ? (
            <>
              <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              {t("saved")}
            </>
          ) : (
            <>
              {typeof navigator !== "undefined" && !navigator.onLine ? (
                <CloudOff className="size-3.5" strokeWidth={2} aria-hidden />
              ) : (
                <AlertCircle className="size-3.5" strokeWidth={2} aria-hidden />
              )}
              {t("notSaved")}
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
