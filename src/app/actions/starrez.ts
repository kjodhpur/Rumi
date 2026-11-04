"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { runInBackground } from "@/lib/background";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { parseCsv } from "@/lib/csv/parse";
import {
  ASSIGNMENT_FIELDS,
  parseAssignmentMapping,
  validateAssignmentRows,
  type AssignmentMapping,
  type RowError,
} from "@/lib/integrations/starrez/import";
import {
  FACTOR_VALUES,
  IMPORT_FACTORS,
  parseQuestionnaire,
  parseQuestionnaireMapping,
  type QuestionnaireMapping,
} from "@/lib/integrations/starrez/questionnaire";
import type { Database } from "@/types/database";
import {
  applyAssignments,
  applyQuestionnaire,
  loadImportMapping,
  runRest,
  saveImportMapping,
  saveRestSettings,
  undoImport,
} from "@/lib/integrations/starrez/sync";

const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);
const MAX_FILE_CHARS = 5_000_000;

async function admin(school: string) {
  if (!schoolId.safeParse(school).success) return null;
  const actorId = await assertRole(school, "export");
  if (!actorId) return null;
  if (!(await rateLimit(`staff-import:${actorId}`, LIMITS.staffImportsPerHour)))
    return "limited" as const;
  return actorId;
}

function done() {
  revalidatePath("/staff/integrations/starrez");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2a: assignment import (CSV)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportPreview {
  jobId: string | null;
  missingColumns: string[];
  inserts: number;
  updates: number;
  unchanged: number;
  errors: RowError[];
}

const importInput = z.object({
  schoolId,
  fileName: z.string().max(200),
  text: z.string().max(MAX_FILE_CHARS, "That file is too big. Split it into files under 5 MB."),
  dryRun: z.boolean(),
});

/** Upload → preview (dry run) → import. Validated row by row; unknown students are reported. */
export async function importAssignmentsCsv(
  raw: z.input<typeof importInput>,
): Promise<ActionResult<ImportPreview>> {
  const parsed = importInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the file.");
  const actorId = await admin(parsed.data.schoolId);
  if (actorId === "limited") return fail("Too many imports. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can import.");

  let table: string[][];
  try {
    table = parseCsv(parsed.data.text);
  } catch {
    return fail("Files can have up to 20,000 rows.");
  }
  if (table.length < 2) return fail("The file has no rows under the header.");
  const db = createAdminClient();
  const [mapping, { data: term }] = await Promise.all([
    loadImportMapping(parsed.data.schoolId, "import_assignments"),
    db
      .from("terms")
      .select("name")
      .eq("school_id", parsed.data.schoolId)
      .eq("active", true)
      .maybeSingle(),
  ]);
  const validation = validateAssignmentRows(table, mapping, {
    terms: term ? [term.name] : undefined,
    today: new Date().toISOString().slice(0, 10),
  });
  if (validation.missingColumns.length)
    return ok({
      jobId: null,
      missingColumns: validation.missingColumns,
      inserts: 0,
      updates: 0,
      unchanged: 0,
      errors: [],
    });

  // The file itself is kept privately for 30 days for audit, then deleted by retention.
  let filePath: string | undefined;
  if (!parsed.data.dryRun) {
    filePath = `${parsed.data.schoolId}/${Date.now()}-${parsed.data.fileName.replace(/[^\w.-]/g, "_").slice(0, 80)}`;
    const { error } = await db.storage
      .from("imports")
      .upload(filePath, new Blob([parsed.data.text], { type: "text/csv" }), {
        contentType: "text/csv",
      });
    if (error) filePath = undefined;
  }
  const result = await applyAssignments(parsed.data.schoolId, validation.rows, {
    dryRun: parsed.data.dryRun,
    actorId,
    provider: "csv",
    fileName: parsed.data.fileName,
    filePath,
    errors: validation.errors,
  });
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: parsed.data.dryRun ? "assignments_import_previewed" : "assignments_imported",
    entity: "import_job",
    entityId: result.jobId,
    meta: {
      inserts: result.plan.inserts,
      updates: result.plan.updates,
      errors: validation.errors.length + result.plan.unknown.length,
    },
  });
  done();
  return ok({
    jobId: result.jobId,
    missingColumns: [],
    inserts: result.plan.inserts,
    updates: result.plan.updates,
    unchanged: result.plan.unchanged,
    errors: [...validation.errors, ...result.plan.unknown, ...result.plan.duplicates].sort(
      (a, b) => a.line - b.line,
    ),
  });
}

export async function undoLastImport(school: string, jobId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(jobId).success) return fail("That import isn't available.");
  const actorId = await admin(school);
  if (actorId === "limited") return fail("Too many changes. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can undo imports.");
  const result = await undoImport(school, jobId);
  if (!result.ok) return fail(result.error);
  await logAudit({
    actorId,
    schoolId: school,
    action: "import_undone",
    entity: "import_job",
    entityId: jobId,
  });
  done();
  return ok();
}

const columnMappingInput = z.object({
  schoolId,
  mapping: z.record(z.enum(ASSIGNMENT_FIELDS), z.string().max(60)),
});

export async function saveAssignmentMapping(
  raw: z.input<typeof columnMappingInput>,
): Promise<ActionResult> {
  const parsed = columnMappingInput.safeParse(raw);
  if (!parsed.success) return fail("Check the column names.");
  const actorId = await admin(parsed.data.schoolId);
  if (actorId === "limited") return fail("Too many changes. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can change the mapping.");
  const mapping: AssignmentMapping = parseAssignmentMapping(parsed.data.mapping);
  const { error } = await saveImportMapping(
    parsed.data.schoolId,
    "import_assignments",
    mapping,
    actorId,
  );
  if (error) return fail("Couldn't save the mapping.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "import_mapping_saved",
    entity: "integration_mapping",
    meta: { direction: "import_assignments" },
  });
  done();
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2d: questionnaire import
// ─────────────────────────────────────────────────────────────────────────────

const questionMappingInput = z.object({
  schoolId,
  questions: z
    .array(
      z.object({
        code: z.string().min(1).max(80),
        factor: z.enum(IMPORT_FACTORS),
        values: z.record(z.string().max(80), z.string().max(40)),
      }),
    )
    .max(40),
});

export async function saveQuestionnaireMapping(
  raw: z.input<typeof questionMappingInput>,
): Promise<ActionResult> {
  const parsed = questionMappingInput.safeParse(raw);
  if (!parsed.success) return fail("Check the question mapping.");
  for (const q of parsed.data.questions) {
    if (Object.values(q.values).some((v) => !FACTOR_VALUES[q.factor].includes(v)))
      return fail(`One answer for ${q.code} maps to a value Rumi doesn't use.`);
  }
  const actorId = await admin(parsed.data.schoolId);
  if (actorId === "limited") return fail("Too many changes. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can change the mapping.");
  const mapping: QuestionnaireMapping = parseQuestionnaireMapping({
    questions: parsed.data.questions,
  });
  const { error } = await saveImportMapping(
    parsed.data.schoolId,
    "import_questionnaire",
    mapping,
    actorId,
  );
  if (error) return fail("Couldn't save the mapping.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "import_mapping_saved",
    entity: "integration_mapping",
    meta: { direction: "import_questionnaire", questions: mapping.questions.length },
  });
  done();
  return ok();
}

export interface QuestionnaireImportResult {
  stored: number;
  students: number;
  held: number;
  unmappedCodes: string[];
  unmappedValues: { code: string; value: string; count: number }[];
  errors: RowError[];
}

export async function importQuestionnaireCsv(
  raw: z.input<typeof importInput>,
): Promise<ActionResult<QuestionnaireImportResult>> {
  const parsed = importInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the file.");
  const actorId = await admin(parsed.data.schoolId);
  if (actorId === "limited") return fail("Too many imports. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can import.");
  let table: string[][];
  try {
    table = parseCsv(parsed.data.text);
  } catch {
    return fail("Files can have up to 20,000 rows.");
  }
  const mapping = await loadImportMapping(parsed.data.schoolId, "import_questionnaire");
  if (!mapping.questions.length) return fail("Map at least one question code first.");
  const parse = parseQuestionnaire(table, mapping);
  const base = {
    unmappedCodes: parse.unmappedCodes,
    unmappedValues: parse.unmappedValues,
    errors: parse.errors,
  };
  if (parsed.data.dryRun || !parse.answers.length)
    return ok({ stored: 0, students: 0, held: 0, ...base });
  const stored = await applyQuestionnaire(parsed.data.schoolId, parse.answers, {
    actorId,
    provider: "csv",
    fileName: parsed.data.fileName,
    unmapped: parse.unmappedCodes.length,
  });
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "questionnaire_imported",
    entity: "imported_answers",
    meta: { stored: stored.stored, students: stored.students, held: stored.held },
  });
  done();
  return ok({ ...stored, ...base });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b: REST
// ─────────────────────────────────────────────────────────────────────────────

const restInput = z.object({
  schoolId,
  baseUrl: z
    .string()
    .url("Use the full https:// address.")
    .max(300)
    .refine((u) => u.startsWith("https://"), "Use an https:// address."),
  username: z.string().min(1, "Add the API username.").max(120),
  password: z.string().max(300).nullable(),
  syncEnabled: z.boolean(),
});

/** Credentials are encrypted at rest and never sent back to the browser. */
export async function saveStarRezConnection(raw: z.input<typeof restInput>): Promise<ActionResult> {
  const parsed = restInput.safeParse(raw);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Check the connection details.");
  const actorId = await admin(parsed.data.schoolId);
  if (actorId === "limited") return fail("Too many changes. Try again in a bit.");
  if (!actorId) return fail("Only housing admins can connect StarRez.");
  const { error } = await saveRestSettings(
    parsed.data.schoolId,
    {
      baseUrl: parsed.data.baseUrl,
      username: parsed.data.username,
      password: parsed.data.password || null,
      syncEnabled: parsed.data.syncEnabled,
    },
    actorId,
  );
  if (error) return fail("Couldn't save the connection.");
  await logAudit({
    actorId,
    schoolId: parsed.data.schoolId,
    action: "starrez_connection_saved",
    entity: "integration",
    meta: { baseUrl: parsed.data.baseUrl, syncEnabled: parsed.data.syncEnabled },
  });
  done();
  return ok();
}

export async function runStarRez(
  school: string,
  action: "test" | "push_groups" | "pull_assignments" | "pull_room_changes",
): Promise<
  ActionResult<{ status: string; processed: number; errors: { id: string; error: string }[] }>
> {
  if (!["test", "push_groups", "pull_assignments", "pull_room_changes"].includes(action))
    return fail("Pick an action.");
  if (!schoolId.safeParse(school).success) return fail("Pick a school.");
  const actorId = await assertRole(school, "export");
  if (!actorId) return fail("Only housing admins can run StarRez actions.");
  if (!(await rateLimit(`integration:${actorId}`, LIMITS.integrationCallsPerHour)))
    return fail("Too many runs. Try again in a bit.");
  const result = await runRest(school, action, actorId);
  await logAudit({
    actorId,
    schoolId: school,
    action: `starrez_${action}`,
    entity: "integration_run",
    meta: { status: result.status, processed: result.processed },
  });
  done();
  return ok(result);
}

// ─────────────────────────────────────────────────────────────────────────────
// Students: confirm or dismiss imported answers (nothing counts before that)
// ─────────────────────────────────────────────────────────────────────────────

/** Confirming copies the answers into the student's preferences and re-ranks. */
export async function resolveImportedAnswers(
  confirm: boolean,
): Promise<ActionResult<{ applied: number }>> {
  if (typeof confirm !== "boolean") return fail("Choose an option.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`imported:${user.id}`, LIMITS.importedAnswersPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const supabase = createClient();
  const { data: pending } = await supabase
    .from("imported_answers")
    .select("mapped_factor, mapped_value")
    .eq("user_id", user.id)
    .is("confirmed_at", null)
    .is("dismissed_at", null);
  const { error } = await supabase.rpc("resolve_imported_answers", { p_confirm: confirm });
  if (error) return fail("Couldn't save that.");
  if (confirm && pending?.length) {
    const patch: Database["public"]["Tables"]["preferences"]["Update"] = {};
    for (const a of pending) {
      switch (a.mapped_factor) {
        case "sleep_schedule":
        case "cleanliness":
        case "noise":
        case "guests":
          patch[a.mapped_factor] = Number(a.mapped_value);
          break;
        case "smoking":
        case "drinking":
        case "pets":
        case "study":
          patch[a.mapped_factor] = a.mapped_value;
          break;
      }
    }
    const { error: prefsError } = await supabase
      .from("preferences")
      .update(patch)
      .eq("user_id", user.id);
    if (prefsError)
      return fail("Your answers were confirmed but couldn't be copied. Edit them in your profile.");
    runInBackground("imported-recompute", () => recomputeMatchesFor(user.id));
  }
  revalidatePath("/settings/imported");
  return ok({ applied: confirm ? (pending?.length ?? 0) : 0 });
}
