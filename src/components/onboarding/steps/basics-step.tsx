"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ChoiceChips } from "@/components/ui/choice";
import { CLASS_YEARS, GENDERS } from "@/lib/options";
import type { StepProps } from "../types";
import { Section } from "./section";

const MAJORS = [
  "Accountancy", "Aerospace Engineering", "Architecture", "Biology", "Biomedical Engineering",
  "Business Administration", "Chemical Engineering", "Communication", "Computer Science",
  "Construction Management", "Criminology", "Data Science", "Digital Culture", "Economics",
  "Electrical Engineering", "Film", "Finance", "Graphic Design", "Journalism", "Kinesiology",
  "Marketing", "Mechanical Engineering", "Nursing", "Psychology", "Public Health",
  "Software Engineering", "Supply Chain Management", "Sustainability",
];

export function BasicsStep({ profile, updateProfile, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName}>
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
        <Field label="Last name" hint="Only your initial is shown." error={errors.lastName}>
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

      <Field label="Pronouns" aside="Optional">
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="she/her, he/him, they/them…"
            value={profile.pronouns}
            onChange={(e) => updateProfile({ pronouns: e.target.value })}
            aria-describedby={describedBy}
            maxLength={24}
          />
        )}
      </Field>

      <Section
        label="Gender"
        hint="Used only to respect everyone's roommate preferences — it isn't shown on your profile."
        error={errors.gender}
      >
        <ChoiceChips
          aria-label="Gender"
          value={profile.gender}
          onValueChange={(gender) => updateProfile({ gender })}
          options={GENDERS}
        />
      </Section>

      <Section label="Year" error={errors.classYear}>
        <ChoiceChips
          aria-label="Year"
          value={profile.classYear}
          onValueChange={(classYear) => updateProfile({ classYear })}
          options={CLASS_YEARS}
        />
      </Section>

      <Field label="Major" error={errors.major}>
        {({ id, describedBy, invalid }) => (
          <>
            <Input
              id={id}
              list="majors"
              placeholder="Start typing…"
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
