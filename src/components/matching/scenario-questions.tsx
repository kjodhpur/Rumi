"use client";

import * as React from "react";
import { Check, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SCENARIOS, type ScenarioQuestion } from "@/lib/matching/scenarios";
import { saveScenarioAnswer } from "@/app/actions/scenarios";

interface ScenarioQuestionsProps {
  initialAnswers?: Record<string, string>;
  onComplete?: () => void;
}

export function ScenarioQuestions({
  initialAnswers = {},
  onComplete,
}: ScenarioQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>(initialAnswers);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  const answeredCount = Object.keys(answers).length;
  const totalCount = DEFAULT_SCENARIOS.length;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);

  async function handleSelectChoice(questionId: string, choiceKey: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceKey }));
    setSavingKey(`${questionId}-${choiceKey}`);

    try {
      const res = await saveScenarioAnswer(questionId, choiceKey);
      if (res.ok) {
        if (answeredCount + 1 === totalCount) {
          toast("All scenarios complete!", {
            description: "Your answers are now factored into match reasons.",
          });
          onComplete?.();
        }
      } else {
        toast("Could not save answer", { description: res.error });
      }
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between text-body-sm">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <Sparkles className="size-4 text-accent" />
            Roommate Scenarios
          </span>
          <span className="text-caption font-medium text-ink-2">
            {answeredCount} of {totalCount} answered
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-caption-xs text-ink-3">
          Quick everyday roommate situations. Takes under 45 seconds and refines your match reasons.
        </p>
      </div>

      {/* Scenario List */}
      <div className="space-y-4">
        {DEFAULT_SCENARIOS.map((scen, idx) => {
          const selectedChoice = answers[scen.id];

          return (
            <div
              key={scen.id}
              className="rounded-2xl border border-line bg-surface p-5 shadow-xs transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-caption-xs font-bold text-ink-2">
                    {idx + 1}
                  </span>
                  <h4 className="text-body font-semibold text-ink">{scen.stem}</h4>
                </div>
                {selectedChoice ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                ) : null}
              </div>

              {/* Choices */}
              <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {scen.choices.map((choice) => {
                  const isSelected = selectedChoice === choice.key;
                  const isSaving = savingKey === `${scen.id}-${choice.key}`;

                  return (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => handleSelectChoice(scen.id, choice.key)}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/10 text-ink shadow-xs"
                          : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:bg-surface-hover"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-accent bg-accent text-white"
                            : "border-line bg-surface"
                        }`}
                      >
                        {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      <span className="text-body-sm font-medium">{choice.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
