"use client";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ChoiceChips } from "@/components/ui/choice";
import type { ProfileDraft, SchoolContext, SchoolOptionKind, StepProps } from "../types";
import { Section } from "./section";

const FIELDS: {
  kind: SchoolOptionKind;
  key: "campus" | "academicCollege" | "residentialCollege" | "llc";
  label: string;
  hint: string;
}[] = [
  { kind: "campus", key: "campus", label: "Campus", hint: "Where most of your classes are." },
  {
    kind: "academic_college",
    key: "academicCollege",
    label: "Academic college",
    hint: "The college your major is in.",
  },
  {
    kind: "residential_college",
    key: "residentialCollege",
    label: "Residential college",
    hint: "If you've been placed in one.",
  },
  {
    kind: "llc",
    key: "llc",
    label: "Living learning community",
    hint: "Only if you applied to one.",
  },
];

/** True when the school has any option lists, so the step is worth showing. */
export function hasSchoolOptions(school: SchoolContext) {
  return FIELDS.some((f) => school.options[f.kind].length > 0);
}

/**
 * Housing-office details (Phase 1 constraints). Used only for the school's matching rules and
 * staff totals; never shown on a profile.
 */
export function SchoolStep({
  profile,
  updateProfile,
  school,
}: StepProps & { school: SchoolContext }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.filter((f) => school.options[f.kind].length > 0).map((f) => (
          <Field key={f.kind} label={f.label} hint={f.hint} aside="Optional">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={profile[f.key] ?? ""}
                onChange={(e) =>
                  updateProfile({ [f.key]: e.target.value || null } as Partial<ProfileDraft>)
                }
              >
                <option value="">{f.kind === "llc" ? "None" : "Not sure yet"}</option>
                {school.options[f.kind].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ))}
      </div>

      <Section
        label="Interested in gender-inclusive housing?"
        hint="Private. Your housing office only sees how many students said yes, never who. It doesn't change who you match with; your roommate preferences do that."
      >
        <ChoiceChips
          aria-label="Interested in gender-inclusive housing"
          value={profile.genderInclusive === null ? "" : profile.genderInclusive ? "yes" : "no"}
          onValueChange={(v) => updateProfile({ genderInclusive: v === "yes" })}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </Section>
    </div>
  );
}
