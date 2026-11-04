"use client";

import { ScenarioQuestions } from "@/components/matching/scenario-questions";
import type { SchoolContext } from "../types";

/** This term's required school questions (Phase 1 term configuration). */
export function QuestionsStep({
  school,
  onAnswersChange,
  error,
}: {
  school: SchoolContext;
  onAnswersChange: (answers: Record<string, string>) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ScenarioQuestions
        required
        initialAnswers={school.answers}
        onAnswersChange={onAnswersChange}
        questions={school.required.map((q) => ({ ...q, outdated: false }))}
      />
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
