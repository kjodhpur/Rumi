"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/ui/choice";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { saveScenarioAnswer } from "@/app/actions/scenarios";

export interface ScenarioQuestionView {
  key: string;
  stem: string;
  /** Answered at an older version: shown as unanswered until answered again. */
  outdated: boolean;
  choices: { key: string; label: string }[];
}

/**
 * Optional everyday-situation questions (Phase 1.F). Each answer saves on tap and refines
 * the matching factor it speaks to; a shared answer can become a "why you match" line.
 */
export function ScenarioQuestions({
  questions,
  initialAnswers,
}: {
  questions: ScenarioQuestionView[];
  initialAnswers: Record<string, string>;
}) {
  const [answers, setAnswers] = React.useState(initialAnswers);
  const [saving, setSaving] = React.useState<string | null>(null);
  const answered = questions.filter((q) => answers[q.key]).length;

  async function choose(key: string, choiceKey: string | null) {
    const previous = answers[key];
    setAnswers((a) => {
      const next = { ...a };
      if (choiceKey) next[key] = choiceKey;
      else delete next[key];
      return next;
    });
    setSaving(key);
    const result = await saveScenarioAnswer({ questionKey: key, choiceKey });
    setSaving(null);
    if (!result.ok) {
      setAnswers((a) => ({ ...a, ...(previous ? { [key]: previous } : {}) }));
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-surface p-4 ring-1 ring-line">
        <div className="flex items-center justify-between text-body-sm">
          <span className="font-medium text-ink">Your answers</span>
          <span className="text-ink-2 tabular-nums" aria-live="polite">
            {answered} of {questions.length}
          </span>
        </div>
        <ProgressBar value={questions.length ? answered / questions.length : 0} className="mt-3" label="Scenarios answered" />
        <p className="mt-2 text-caption text-ink-3">Optional. Skip any you like; you can change or clear an answer anytime.</p>
      </div>

      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <li key={q.key} className="rounded-lg bg-surface p-5 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <h2 id={`scenario-${q.key}`} className="text-body font-medium text-ink">
                <span className="mr-2 text-ink-3 tabular-nums">{i + 1}.</span>
                {q.stem}
              </h2>
              {answers[q.key] ? (
                <Button variant="ghost" size="sm" disabled={saving === q.key} onClick={() => void choose(q.key, null)}>
                  Clear
                </Button>
              ) : null}
            </div>
            {q.outdated && !answers[q.key] ? (
              <p className="mt-1 text-caption text-warning">This question changed. Answer it again so it counts.</p>
            ) : null}
            <ChoiceChips
              className="mt-4"
              aria-labelledby={`scenario-${q.key}`}
              value={answers[q.key] ?? ""}
              onValueChange={(choice) => void choose(q.key, choice)}
              options={q.choices.map((c) => ({ value: c.key, label: c.label }))}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
