"use client";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ChoiceChips, MultiChips } from "@/components/ui/choice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useOptions, useT } from "@/components/providers/i18n";
import { formatMoney } from "@/lib/utils";
import type { StepProps } from "../types";
import { Section } from "./section";

const BUDGET_MIN = 300;
const BUDGET_MAX = 2500;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function HousingStep({ prefs, updatePrefs, errors }: StepProps) {
  const t = useT("onboarding");
  const { HOUSING_TYPES, LEASE_LENGTHS, ROOMMATE_GENDERS } = useOptions();
  return (
    <div className="flex flex-col gap-9">
      <Section label={t("housing.budget")} error={errors.budgetMax}>
        <p className="font-display text-display-sm text-ink tabular" aria-live="polite">
          {formatMoney(prefs.budgetMin)} – {formatMoney(prefs.budgetMax)}
          <span className="ml-1.5 font-sans text-body-sm text-ink-3">{t("housing.perMonth")}</span>
        </p>
        <Slider
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={25}
          minStepsBetweenThumbs={2}
          value={[prefs.budgetMin, prefs.budgetMax]}
          onValueChange={([budgetMin, budgetMax]) => updatePrefs({ budgetMin, budgetMax })}
          thumbLabels={[t("housing.minBudget"), t("housing.maxBudget")]}
        />
        <div className="flex justify-between text-caption text-ink-3">
          <span>{formatMoney(BUDGET_MIN)}</span>
          <span>{formatMoney(BUDGET_MAX)}+</span>
        </div>
      </Section>

      <Field label={t("housing.moveIn")} error={errors.moveInDate}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="date"
            min={today()}
            value={prefs.moveInDate}
            onChange={(e) => updatePrefs({ moveInDate: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className="max-w-[240px]"
          />
        )}
      </Field>

      <Section label={t("housing.lease")}>
        <ChoiceChips
          aria-label={t("housing.lease")}
          value={prefs.leaseLength}
          onValueChange={(leaseLength) => updatePrefs({ leaseLength })}
          options={LEASE_LENGTHS}
        />
      </Section>

      <Section label={t("housing.campus")}>
        <SegmentedControl
          aria-label={t("housing.campusLabel")}
          value={prefs.housingType}
          onValueChange={(housingType) => updatePrefs({ housingType })}
          options={HOUSING_TYPES.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Section>

      <Section
        label={t("housing.openTo")}
        hint={prefs.genderPref.length === 0 ? t("housing.anyone") : t("housing.mutual")}
      >
        <MultiChips
          aria-label={t("housing.openToLabel")}
          value={prefs.genderPref}
          onValueChange={(genderPref) => updatePrefs({ genderPref })}
          options={ROOMMATE_GENDERS}
        />
      </Section>
    </div>
  );
}
