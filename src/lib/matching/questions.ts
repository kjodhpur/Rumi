import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeQuestions, type Question, type QuestionChoice } from "./scenarios";
import type { ScenarioFactor } from "./types";

/** A school's live, Fair-Housing-reviewed questions (service role; used by matching and forms). */
export async function loadSchoolQuestions(schoolId: string): Promise<Question[]> {
  const { data } = await createAdminClient()
    .from("school_questions")
    .select("key, version, kind, factor, stem, choices, position")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .not("reviewed_at", "is", null)
    .order("position");
  return (data ?? []).map((row) => ({
    key: row.key,
    version: row.version,
    kind: row.kind as Question["kind"],
    factor: row.factor as ScenarioFactor,
    stem: row.stem,
    topic: row.stem
      .replace(/[.?!]+$/, "")
      .toLowerCase()
      .slice(0, 60),
    choices: (Array.isArray(row.choices) ? row.choices : []) as unknown as QuestionChoice[],
    schoolId,
  }));
}

/** Everything a student at this school is asked: school questions plus Rumi's defaults. */
export async function loadActiveQuestions(schoolId: string): Promise<Question[]> {
  return activeQuestions(await loadSchoolQuestions(schoolId));
}
