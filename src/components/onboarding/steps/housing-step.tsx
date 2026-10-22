"use client";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ChoiceChips, MultiChips } from "@/components/ui/choice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { HOUSING_TYPES, LEASE_LENGTHS, ROOMMATE_GENDERS } from "@/lib/options";
import { formatMoney } from "@/lib/utils";
import type { StepProps } from "../types";
import { Section } from "./section";

const BUDGET_MIN = 300;
const BUDGET_MAX = 2500;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function HousingStep({ prefs, updatePrefs, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-9">
      <Section label="Monthly budget for your share of rent" error={errors.budgetMax}>
        <p className="font-display text-display-sm text-ink tabular" aria-live="polite">
          {formatMoney(prefs.budgetMin)} – {formatMoney(prefs.budgetMax)}
          <span className="ml-1.5 font-sans text-body-sm text-ink-3">/ month</span>
        </p>
        <Slider
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={25}
          minStepsBetweenThumbs={2}
          value={[prefs.budgetMin, prefs.budgetMax]}
          onValueChange={([budgetMin, budgetMax]) => updatePrefs({ budgetMin, budgetMax })}
          thumbLabels={["Minimum budget", "Maximum budget"]}
        />
        <div className="flex justify-between text-caption text-ink-3">
          <span>{formatMoney(BUDGET_MIN)}</span>
          <span>{formatMoney(BUDGET_MAX)}+</span>
        </div>
      </Section>

      <Field label="Ideal move-in date" error={errors.moveInDate}>
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

      <Section label="Lease length">
        <ChoiceChips
          aria-label="Lease length"
          value={prefs.leaseLength}
          onValueChange={(leaseLength) => updatePrefs({ leaseLength })}
          options={LEASE_LENGTHS}
        />
      </Section>

      <Section label="On or off campus?">
        <SegmentedControl
          aria-label="On or off campus"
          value={prefs.housingType}
          onValueChange={(housingType) => updatePrefs({ housingType })}
          options={HOUSING_TYPES.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Section>

      <Section
        label="I'm open to living with"
        hint={prefs.genderPref.length === 0 ? "Anyone — leave all unselected." : "Only people who are open to living with you, too."}
      >
        <MultiChips
          aria-label="Open to living with"
          value={prefs.genderPref}
          onValueChange={(genderPref) => updatePrefs({ genderPref })}
          options={ROOMMATE_GENDERS}
        />
      </Section>
    </div>
  );
}
