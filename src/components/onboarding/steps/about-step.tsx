"use client";

import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../types";

const PROMPTS = [
  "A typical weeknight for me is…",
  "On weekends you'll find me…",
  "The roommate I get along with best…",
  "Something I'm weirdly particular about…",
];

export function AboutStep({ profile, updateProfile, errors }: StepProps) {
  const length = profile.bio.length;
  const addPrompt = (prompt: string) => {
    const spacer = profile.bio && !profile.bio.endsWith("\n") ? "\n\n" : "";
    updateProfile({ bio: `${profile.bio}${spacer}${prompt} ` });
  };
  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Your bio"
        error={errors.bio}
        aside={<span className={length > 480 ? "text-warning" : undefined}>{length}/500</span>}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={6}
            maxLength={500}
            placeholder="Nursing junior, usually up early for clinicals. I cook a lot and I'm happy to share. Looking for someone chill who keeps common areas tidy…"
            value={profile.bio}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
        )}
      </Field>
      <div>
        <p className="mb-3 text-body-sm text-ink-3">Stuck? Start with a prompt:</p>
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
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
