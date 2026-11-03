import { headerIndex } from "@/lib/csv/parse";

/**
 * Housing questionnaire import (Phase 2d). Pure.
 *
 * A school maps its housing system's question codes to Rumi factors and answer values in a
 * mapping UI; nothing is hardcoded. Imported answers prefill the student's profile and count
 * only after the student confirms them.
 */

export const IMPORT_FACTORS = ["sleep_schedule", "cleanliness", "noise", "guests", "smoking", "drinking", "pets", "study"] as const;
export type ImportFactor = (typeof IMPORT_FACTORS)[number];

/** Allowed Rumi values per factor (scales are 1–5). */
export const FACTOR_VALUES: Record<ImportFactor, readonly string[]> = {
  sleep_schedule: ["1", "2", "3", "4", "5"],
  cleanliness: ["1", "2", "3", "4", "5"],
  noise: ["1", "2", "3", "4", "5"],
  guests: ["1", "2", "3", "4", "5"],
  smoking: ["never", "sometimes", "regularly"],
  drinking: ["never", "socially", "often"],
  pets: ["none", "have", "want"],
  study: ["campus", "home_quiet", "home_social", "mix"],
};

export interface QuestionMap {
  /** The housing system's question code (matched case-insensitively). */
  code: string;
  factor: ImportFactor;
  /** Raw answer (case-insensitive) → Rumi value. */
  values: Record<string, string>;
}

export interface QuestionnaireMapping {
  questions: QuestionMap[];
}

/** A starting point staff can edit; confirm codes against your own questionnaire export. */
export const STARTER_QUESTIONNAIRE_MAPPING: QuestionnaireMapping = {
  questions: [
    { code: "SLEEP", factor: "sleep_schedule", values: { EARLY: "1", BEFORE_MIDNIGHT: "2", MIDNIGHT: "3", AFTER_1AM: "4", NIGHT_OWL: "5" } },
    { code: "CLEANLINESS", factor: "cleanliness", values: { RELAXED: "1", SOMEWHAT_TIDY: "2", AVERAGE: "3", TIDY: "4", SPOTLESS: "5" } },
    { code: "NOISE", factor: "noise", values: { SILENT: "1", QUIET: "2", NORMAL: "3", MUSIC_ON: "4", LOUD: "5" } },
    { code: "GUESTS", factor: "guests", values: { RARELY: "1", OCCASIONALLY: "2", MONTHLY: "3", WEEKENDS: "4", OFTEN: "5" } },
    { code: "SMOKING", factor: "smoking", values: { NO: "never", OUTSIDE: "sometimes", YES: "regularly" } },
    { code: "DRINKING", factor: "drinking", values: { NO: "never", SOCIALLY: "socially", OFTEN: "often" } },
    { code: "PETS", factor: "pets", values: { NONE: "none", HAVE: "have", WANT: "want" } },
    { code: "STUDY", factor: "study", values: { LIBRARY: "campus", QUIET_ROOM: "home_quiet", WITH_FRIENDS: "home_social", MIX: "mix" } },
  ],
};

const norm = (s: string) => s.trim().toUpperCase();

/** Keeps only well-formed entries: known factor, allowed values, unique codes. */
export function parseQuestionnaireMapping(value: unknown): QuestionnaireMapping {
  const list = value && typeof value === "object" && Array.isArray((value as { questions?: unknown }).questions) ? ((value as { questions: unknown[] }).questions) : [];
  const seen = new Set<string>();
  const questions: QuestionMap[] = [];
  for (const raw of list.slice(0, 40)) {
    const q = raw as Partial<QuestionMap>;
    if (typeof q.code !== "string" || !q.code.trim() || !IMPORT_FACTORS.includes(q.factor as ImportFactor)) continue;
    const code = norm(q.code).slice(0, 80);
    if (seen.has(code)) continue;
    seen.add(code);
    const factor = q.factor as ImportFactor;
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(q.values ?? {})) {
      if (typeof v === "string" && FACTOR_VALUES[factor].includes(v) && k.trim()) values[norm(k).slice(0, 80)] = v;
    }
    questions.push({ code, factor, values });
  }
  return { questions };
}

export interface ImportedAnswer {
  line: number;
  studentId: string | null;
  email: string | null;
  questionCode: string;
  rawValue: string;
  factor: ImportFactor;
  value: string;
}

export interface QuestionnaireParse {
  answers: ImportedAnswer[];
  unmappedCodes: string[];
  unmappedValues: { code: string; value: string; count: number }[];
  errors: { line: number; message: string }[];
}

/** Long format: one row per answer (StudentID/Email, QuestionCode, Answer). */
export function parseQuestionnaire(table: string[][], mapping: QuestionnaireMapping): QuestionnaireParse {
  const [headers = [], ...body] = table;
  const idx = headerIndex(headers);
  const pick = (...names: string[]) => names.map(idx).find((i) => i >= 0) ?? -1;
  const idCol = pick("StudentID", "EntryID", "Student ID", "ID");
  const emailCol = pick("Email", "E-mail");
  const codeCol = pick("QuestionCode", "Question", "Code");
  const valueCol = pick("Answer", "AnswerText", "Response", "Value");
  const out: QuestionnaireParse = { answers: [], unmappedCodes: [], unmappedValues: [], errors: [] };
  if ((idCol < 0 && emailCol < 0) || codeCol < 0 || valueCol < 0) {
    out.errors.push({ line: 1, message: "The file needs StudentID or Email, QuestionCode and Answer columns." });
    return out;
  }
  const byCode = new Map(mapping.questions.map((q) => [q.code, q]));
  const unmappedCodes = new Set<string>();
  const unmappedValues = new Map<string, { code: string; value: string; count: number }>();
  body.forEach((cells, i) => {
    const line = i + 2;
    const studentId = idCol >= 0 ? (cells[idCol] ?? "").trim() : "";
    const email = emailCol >= 0 ? (cells[emailCol] ?? "").trim().toLowerCase() : "";
    const code = norm(cells[codeCol] ?? "");
    const raw = (cells[valueCol] ?? "").trim();
    if (!studentId && !email) return void out.errors.push({ line, message: "No student ID or email." });
    if (!code || !raw) return void out.errors.push({ line, message: "No question code or answer." });
    const q = byCode.get(code);
    if (!q) return void unmappedCodes.add(code);
    const value = q.values[norm(raw)] ?? (FACTOR_VALUES[q.factor].includes(raw) ? raw : undefined);
    if (!value) {
      const key = `${code}|${norm(raw)}`;
      const entry = unmappedValues.get(key) ?? { code, value: raw, count: 0 };
      entry.count += 1;
      unmappedValues.set(key, entry);
      return;
    }
    out.answers.push({ line, studentId: studentId || null, email: email || null, questionCode: code, rawValue: raw.slice(0, 200), factor: q.factor, value });
  });
  out.unmappedCodes = [...unmappedCodes].sort();
  out.unmappedValues = [...unmappedValues.values()].sort((a, b) => b.count - a.count);
  return out;
}

/** The latest answer per student and factor (a later row in the file wins). */
export function latestPerFactor(answers: ImportedAnswer[]): ImportedAnswer[] {
  const map = new Map<string, ImportedAnswer>();
  for (const a of answers) map.set(`${a.studentId ?? a.email}|${a.factor}`, a);
  return [...map.values()];
}
