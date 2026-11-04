"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChoiceChips } from "@/components/ui/choice";
import { useOptions, useT } from "@/components/providers/i18n";
import type { StepProps } from "../types";
import { Section } from "./section";

const TRACKS = ["freshman", "returning", "transfer", "grad"] as const;

const MAJORS = [
  "Accountancy",
  "Aerospace Engineering",
  "Architecture",
  "Biology",
  "Biomedical Engineering",
  "Business Administration",
  "Chemical Engineering",
  "Communication",
  "Computer Science",
  "Construction Management",
  "Criminology",
  "Data Science",
  "Digital Culture",
  "Economics",
  "Electrical Engineering",
  "Film",
  "Finance",
  "Graphic Design",
  "Journalism",
  "Kinesiology",
  "Marketing",
  "Mechanical Engineering",
  "Nursing",
  "Psychology",
  "Public Health",
  "Software Engineering",
  "Supply Chain Management",
  "Sustainability",
];

export function BasicsStep({
  profile,
  updateProfile,
  errors,
  trackLocked = false,
}: StepProps & { trackLocked?: boolean }) {
  const t = useT("onboarding");
  const { CLASS_YEARS, GENDERS } = useOptions();
  const tracks = TRACKS.map((value) => ({ value, label: t(`basics.tracks.${value}`) }));
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("basics.firstName")} error={errors.firstName}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="given-name"
              value={profile.firstName}
              onChange={(e) => updateProfile({ firstName: e.target.value })}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              maxLength={40}
            />
          )}
        </Field>
        <Field label={t("basics.lastName")} hint={t("basics.lastNameHint")} error={errors.lastName}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="family-name"
              value={profile.lastName}
              onChange={(e) => updateProfile({ lastName: e.target.value })}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              maxLength={60}
            />
          )}
        </Field>
      </div>

      <Field label={t("basics.pronouns")} aside={t("basics.optional")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder={t("basics.pronounsPlaceholder")}
            value={profile.pronouns}
            onChange={(e) => updateProfile({ pronouns: e.target.value })}
            aria-describedby={describedBy}
            maxLength={24}
          />
        )}
      </Field>

      <Section label={t("basics.gender")} hint={t("basics.genderHint")} error={errors.gender}>
        <ChoiceChips
          aria-label={t("basics.gender")}
          value={profile.gender}
          onValueChange={(gender) => updateProfile({ gender })}
          options={GENDERS}
        />
      </Section>

      <Section label={t("basics.year")} error={errors.classYear}>
        <ChoiceChips
          aria-label={t("basics.year")}
          value={profile.classYear}
          onValueChange={(classYear) => updateProfile({ classYear })}
          options={CLASS_YEARS}
        />
      </Section>

      <Section
        label={t("basics.track")}
        hint={trackLocked ? t("basics.trackLocked") : t("basics.trackHint")}
      >
        <ChoiceChips
          aria-label={t("basics.track")}
          value={profile.track ?? ""}
          onValueChange={(track) => {
            if (!trackLocked) updateProfile({ track });
          }}
          options={tracks.filter((o) => !trackLocked || o.value === profile.track)}
        />
      </Section>

      <Field label={t("basics.major")} error={errors.major}>
        {({ id, describedBy, invalid }) => (
          <>
            <Input
              id={id}
              list="majors"
              placeholder={t("basics.majorPlaceholder")}
              value={profile.major}
              onChange={(e) => updateProfile({ major: e.target.value })}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              maxLength={80}
            />
            <datalist id="majors">
              {MAJORS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </>
        )}
      </Field>
    </div>
  );
}
