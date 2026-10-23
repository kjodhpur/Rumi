"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutosave } from "@/components/onboarding/use-autosave";
import { savePreferences } from "@/app/actions/onboarding";
import { BasicsStep } from "@/components/onboarding/steps/basics-step";
import { AboutStep } from "@/components/onboarding/steps/about-step";
import { HousingStep } from "@/components/onboarding/steps/housing-step";
import { AreasStep } from "@/components/onboarding/steps/areas-step";
import { LifestyleStep } from "@/components/onboarding/steps/lifestyle-step";
import { HabitsStep } from "@/components/onboarding/steps/habits-step";
import { PrioritiesStep } from "@/components/onboarding/steps/priorities-step";
import { DealbreakersStep } from "@/components/onboarding/steps/dealbreakers-step";
import { PhotoManager } from "@/components/onboarding/photo-manager";
import type { OnboardingData, PrefsDraft, ProfileDraft } from "@/components/onboarding/types";
import type { PhotoRecord } from "@/app/actions/photos";
import { basicsSchema, bioSchema } from "@/lib/validation";
import { SettingsBack } from "./settings-ui";

/** Every onboarding answer, editable in place. Changes save themselves and re-rank matches. */
export function ProfileEditor({ data }: { data: OnboardingData }) {
  const [profile, setProfile] = React.useState<ProfileDraft>(data.profile);
  const [prefs, setPrefs] = React.useState<PrefsDraft>(data.prefs);
  const [photos, setPhotos] = React.useState<PhotoRecord[]>(data.photos);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { status, queue } = useAutosave(800, savePreferences);

  const updateProfile = React.useCallback(
    (patch: Partial<ProfileDraft>) => {
      setProfile((p) => ({ ...p, ...patch }));
      const valid: Partial<ProfileDraft> = {};
      const nextErrors: Record<string, string> = {};
      for (const [key, value] of Object.entries(patch) as [keyof ProfileDraft, string][]) {
        const schema =
          key === "bio"
            ? bioSchema.shape.bio
            : key === "pronouns"
              ? null
              : (basicsSchema.shape as Record<string, import("zod").ZodTypeAny>)[key];
        const result = schema ? schema.safeParse(value) : { success: true as const };
        if (result.success) (valid as Record<string, string>)[key] = value;
        else nextErrors[key] = result.error.issues[0]?.message ?? "Check this field.";
      }
      setErrors((e) => {
        const merged = { ...e };
        for (const key of Object.keys(patch)) delete merged[key];
        return { ...merged, ...nextErrors };
      });
      if (Object.keys(valid).length) queue({ profile: valid as Record<string, never> });
    },
    [queue],
  );

  const updatePrefs = React.useCallback(
    (patch: Partial<PrefsDraft>) => {
      setPrefs((p) => ({ ...p, ...patch }));
      if (patch.areas && patch.areas.length === 0) {
        setErrors((e) => ({ ...e, areas: "Keep at least one neighborhood." }));
        return;
      }
      setErrors((e) => {
        const { areas: _areas, ...rest } = e;
        return rest;
      });
      queue({ prefs: patch as Record<string, never> });
    },
    [queue],
  );

  const stepProps = { profile, prefs, updateProfile, updatePrefs, errors };

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-start justify-between gap-4">
        <SettingsBack title="Profile & preferences" description="Changes save automatically and re-rank your matches." />
        <div className="pt-12">
          <Status status={status} />
        </div>
      </div>
      <Tabs defaultValue="about">
        <TabsList className="scrollbar-none mb-8 overflow-x-auto">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="housing">Housing</TabsTrigger>
          <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
          <TabsTrigger value="matching">Matching</TabsTrigger>
        </TabsList>
        <TabsContent value="about" className="flex flex-col gap-10 outline-none">
          <BasicsStep {...stepProps} />
          <AboutStep {...stepProps} />
        </TabsContent>
        <TabsContent value="photos" className="outline-none">
          <PhotoManager userId={data.userId} photos={photos} onChange={setPhotos} />
        </TabsContent>
        <TabsContent value="housing" className="flex flex-col gap-10 outline-none">
          <HousingStep {...stepProps} />
          <div>
            <h2 className="mb-4 text-body font-medium text-ink">Neighborhoods</h2>
            <AreasStep {...stepProps} areas={data.areas} />
          </div>
        </TabsContent>
        <TabsContent value="lifestyle" className="flex flex-col gap-10 outline-none">
          <LifestyleStep {...stepProps} />
          <HabitsStep {...stepProps} />
        </TabsContent>
        <TabsContent value="matching" className="flex flex-col gap-10 outline-none">
          <div>
            <h2 className="mb-1 text-body font-medium text-ink">What matters most</h2>
            <PrioritiesStep {...stepProps} musicEnabled={data.spotify.connected} />
          </div>
          <div>
            <h2 className="mb-4 text-body font-medium text-ink">Dealbreakers</h2>
            <DealbreakersStep {...stepProps} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Status({ status }: { status: ReturnType<typeof useAutosave>["status"] }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "idle" ? null : (
        <motion.span
          key={status}
          role="status"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={status === "error" ? "flex items-center gap-1.5 text-caption font-medium text-danger" : "flex items-center gap-1.5 text-caption font-medium text-ink-3"}
        >
          {status === "saving" ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-ink-3" /> Saving
            </>
          ) : status === "saved" ? (
            <>
              <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> Saved · matches updating
            </>
          ) : (
            <>
              <AlertCircle className="size-3.5" strokeWidth={2} aria-hidden /> Not saved
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
