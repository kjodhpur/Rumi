"use client";

import { OptionCards } from "@/components/ui/choice";
import { DRINKING, PETS, SMOKING, STUDY } from "@/lib/options";
import type { StepProps } from "../types";
import { Section } from "./section";

export function HabitsStep({ prefs, updatePrefs }: StepProps) {
  return (
    <div className="flex flex-col gap-9">
      <Section label="Smoking or vaping">
        <OptionCards aria-label="Smoking or vaping" value={prefs.smoking} onValueChange={(smoking) => updatePrefs({ smoking })} options={SMOKING} />
      </Section>
      <Section label="Drinking">
        <OptionCards aria-label="Drinking" value={prefs.drinking} onValueChange={(drinking) => updatePrefs({ drinking })} options={DRINKING} />
      </Section>
      <Section label="Pets">
        <OptionCards aria-label="Pets" value={prefs.pets} onValueChange={(pets) => updatePrefs({ pets })} options={PETS} />
      </Section>
      <Section label="Where do you study?">
        <OptionCards aria-label="Where do you study" value={prefs.study} onValueChange={(study) => updatePrefs({ study })} options={STUDY} columns={2} />
      </Section>
    </div>
  );
}
