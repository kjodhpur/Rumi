"use client";

import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../types";
import { useT } from "@/components/providers/i18n";

const PROMPTS = ["p1", "p2", "p3", "p4"] as const;

export function AboutStep({ profile, updateProfile, errors }: StepProps) {
  const t = useT("onboarding");
  const length = profile.bio.length;
  const addPrompt = (prompt: string) => {
    const spacer = profile.bio && !profile.bio.endsWith("\n") ? "\n\n" : "";
    updateProfile({ bio: `${profile.bio}${spacer}${prompt} ` });
  };
  return (
    <div className="flex flex-col gap-6">
      <Field
        label={t("about.bio")}
        error={errors.bio}
        aside={<span className={length > 480 ? "text-warning" : undefined}>{length}/500</span>}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={6}
            maxLength={500}
            placeholder={t("about.placeholder")}
            value={profile.bio}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <div>
        <p className="mb-3 text-body-sm text-ink-3">{t("about.stuck")}</p>
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((key) => t(`about.prompts.${key}`)).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => addPrompt(prompt)}
              className="rounded-full bg-surface-sunken px-3.5 py-2 text-body-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink active:scale-[0.97]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
