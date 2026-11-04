"use client";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ChoiceChips } from "@/components/ui/choice";
import type { ProfileDraft, SchoolContext, SchoolOptionKind, StepProps } from "../types";
import { Section } from "./section";
import { useT } from "@/components/providers/i18n";

const FIELDS: {
  kind: SchoolOptionKind;
  key: "campus" | "academicCollege" | "residentialCollege" | "llc";
}[] = [
  { kind: "campus", key: "campus" },
  { kind: "academic_college", key: "academicCollege" },
  { kind: "residential_college", key: "residentialCollege" },
  { kind: "llc", key: "llc" },
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
  const t = useT("onboarding");
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.filter((f) => school.options[f.kind].length > 0).map((f) => (
          <Field
            key={f.kind}
            label={t(`school.${f.key}`)}
            hint={t(`school.${f.key}Hint`)}
            aside={t("basics.optional")}
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={profile[f.key] ?? ""}
                onChange={(e) =>
                  updateProfile({ [f.key]: e.target.value || null } as Partial<ProfileDraft>)
                }
              >
                <option value="">
                  {f.kind === "llc" ? t("school.none") : t("school.notSure")}
                </option>
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

      <Section label={t("school.inclusive")} hint={t("school.inclusiveHint")}>
        <ChoiceChips
          aria-label={t("school.inclusiveLabel")}
          value={profile.genderInclusive === null ? "" : profile.genderInclusive ? "yes" : "no"}
          onValueChange={(v) => updateProfile({ genderInclusive: v === "yes" })}
          options={[
            { value: "yes", label: t("school.yes") },
            { value: "no", label: t("school.no") },
          ]}
        />
      </Section>
    </div>
  );
}
