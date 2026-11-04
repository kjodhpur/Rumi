"use client";

import { OptionCards } from "@/components/ui/choice";
import { useOptions, useT } from "@/components/providers/i18n";
import type { StepProps } from "../types";
import { Section } from "./section";

export function HabitsStep({ prefs, updatePrefs }: StepProps) {
  const t = useT("onboarding");
  const { DRINKING, PETS, SMOKING, STUDY } = useOptions();
  return (
    <div className="flex flex-col gap-9">
      <Section label={t("habits.smoking")}>
        <OptionCards
          aria-label={t("habits.smoking")}
          value={prefs.smoking}
          onValueChange={(smoking) => updatePrefs({ smoking })}
          options={SMOKING}
        />
      </Section>
      <Section label={t("habits.drinking")}>
        <OptionCards
          aria-label={t("habits.drinking")}
          value={prefs.drinking}
          onValueChange={(drinking) => updatePrefs({ drinking })}
          options={DRINKING}
        />
      </Section>
      <Section label={t("habits.pets")}>
        <OptionCards
          aria-label={t("habits.pets")}
          value={prefs.pets}
          onValueChange={(pets) => updatePrefs({ pets })}
          options={PETS}
        />
      </Section>
      <Section label={t("habits.study")}>
        <OptionCards
          aria-label={t("habits.studyLabel")}
          value={prefs.study}
          onValueChange={(study) => updatePrefs({ study })}
          options={STUDY}
          columns={2}
        />
      </Section>
    </div>
  );
}
