import { z } from "zod";
import { headerIndex } from "@/lib/csv/parse";

/**
 * Housing-system assignment import (Phase 2a), shared by CSV upload and the REST pull.
 * Pure: column mapping, row-by-row validation, and an idempotent plan against what's
 * already stored. Unknown students are reported, never created.
 */

export const ASSIGNMENT_FIELDS = ["studentId", "email", "building", "room", "bed", "term", "movedIn"] as const;
export type AssignmentField = (typeof ASSIGNMENT_FIELDS)[number];

export const ASSIGNMENT_FIELD_LABEL: Record<AssignmentField, string> = {
  studentId: "Student ID",
  email: "Email",
  building: "Building",
  room: "Room",
  bed: "Bed",
  term: "Term",
  movedIn: "Move-in date",
};

/** Field → source column (CSV header or REST field). Configurable per school. */
export type AssignmentMapping = Record<AssignmentField, string>;

export const DEFAULT_ASSIGNMENT_MAPPING: AssignmentMapping = {
  studentId: "StudentID",
  email: "Email",
  building: "Building",
  room: "Room",
  bed: "Bed",
  term: "Term",
  movedIn: "CheckInDate",
};

/** Common alternative headers, tried when the mapped one isn't in the file. */
const ALIASES: Record<AssignmentField, string[]> = {
  studentId: ["EntryID", "Student ID", "ID", "ASUID", "Student Number"],
  email: ["E-mail", "Email Address", "School Email"],
  building: ["Hall", "RoomLocation", "Residence Hall", "BuildingCode"],
  room: ["RoomSpace", "Room Number", "RoomSpaceDescription"],
  bed: ["Bed Space", "BedDescription", "Space"],
  term: ["TermCode", "Term Name", "Session"],
  movedIn: ["Check In", "Move In", "MoveInDate", "Start Date"],
};

export function parseAssignmentMapping(value: unknown): AssignmentMapping {
  const v = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    ASSIGNMENT_FIELDS.map((f) => [f, typeof v[f] === "string" && (v[f] as string).trim() ? (v[f] as string).trim().slice(0, 60) : DEFAULT_ASSIGNMENT_MAPPING[f]]),
  ) as AssignmentMapping;
}

/** Column index per field for this file's headers (mapped name first, then aliases). */
export function resolveColumns(headers: string[], mapping: AssignmentMapping): Record<AssignmentField, number> {
  const idx = headerIndex(headers);
  return Object.fromEntries(
    ASSIGNMENT_FIELDS.map((f) => {
      const direct = idx(mapping[f]);
      return [f, direct >= 0 ? direct : (ALIASES[f].map(idx).find((i) => i >= 0) ?? -1)];
    }),
  ) as Record<AssignmentField, number>;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** A real calendar day as YYYY-MM-DD, or null ("2027-02-30" and "31/31/2027" aren't days). */
export function toIsoDate(value: string): string | null {
  const m = usDate.exec(value);
  const iso = isoDate.test(value)
    ? value
    : m
      ? `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`
      : null;
  if (!iso) return null;
  const [y, mo, d] = iso.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, mo - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d
    ? iso
    : null;
}

const rowSchema = z
  .object({
    studentId: z.string().max(40).regex(/^[A-Za-z0-9-]*$/, "Student ID can only have letters, numbers and dashes."),
    email: z.union([z.literal(""), z.string().email("That email doesn't look right.").max(254)]),
    building: z.string().min(1, "Building is missing.").max(80),
    room: z.string().max(40),
    bed: z.string().max(20),
    term: z.string().max(60),
    movedIn: z.string().max(20),
  })
  .refine((r) => r.studentId || r.email, { message: "Each row needs a student ID or an email." });

export interface AssignmentRow {
  line: number;
  studentId: string | null;
  email: string | null;
  building: string;
  room: string | null;
  bed: string | null;
  term: string | null;
  movedIn: string | null;
}

export interface RowError {
  line: number;
  message: string;
}

export interface ValidationResult {
  rows: AssignmentRow[];
  errors: RowError[];
  missingColumns: AssignmentField[];
}

/** Validates every row; `line` is the 1-based line in the file (header is line 1). */
export function validateAssignmentRows(
  table: string[][],
  mapping: AssignmentMapping,
  options: { terms?: string[]; today?: string } = {},
): ValidationResult {
  const [headers = [], ...body] = table;
  const cols = resolveColumns(headers, mapping);
  const missingColumns: AssignmentField[] = [];
  if (cols.building < 0) missingColumns.push("building");
  if (cols.studentId < 0 && cols.email < 0) missingColumns.push("studentId", "email");
  if (missingColumns.length) return { rows: [], errors: [], missingColumns };

  const terms = options.terms?.map((t) => t.toLowerCase());
  const rows: AssignmentRow[] = [];
  const errors: RowError[] = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const get = (f: AssignmentField) => (cols[f] >= 0 ? (cells[cols[f]] ?? "").trim() : "");
    const parsed = rowSchema.safeParse({ studentId: get("studentId"), email: get("email").toLowerCase(), building: get("building"), room: get("room"), bed: get("bed"), term: get("term"), movedIn: get("movedIn") });
    if (!parsed.success) return void errors.push({ line, message: parsed.error.issues[0]?.message ?? "This row isn't valid." });
    const r = parsed.data;
    if (r.term && terms && !terms.includes(r.term.toLowerCase())) return void errors.push({ line, message: `Term "${r.term}" isn't this term.` });
    const movedIn = r.movedIn ? toIsoDate(r.movedIn) : null;
    if (r.movedIn && !movedIn) return void errors.push({ line, message: "Use YYYY-MM-DD or MM/DD/YYYY for the move-in date." });
    rows.push({ line, studentId: r.studentId || null, email: r.email || null, building: r.building, room: r.room || null, bed: r.bed || null, term: r.term || null, movedIn: movedIn ?? options.today ?? null });
  });
  return { rows, errors, missingColumns };
}

export interface ExistingAssignment {
  id: string;
  userId: string;
  building: string;
  room: string | null;
  bed: string | null;
  externalRef: string | null;
}

export interface ImportPlan {
  inserts: (AssignmentRow & { userId: string; externalRef: string })[];
  updates: (AssignmentRow & { userId: string; externalRef: string; assignmentId: string })[];
  unchanged: number;
  unknown: RowError[];
  duplicates: RowError[];
}

/**
 * What an import would do. A row matches a Rumi student by student ID, then email. The same
 * student twice in one file is a duplicate (first row wins). Re-importing the same file
 * changes nothing.
 */
export function planImport(
  rows: AssignmentRow[],
  lookup: { byStudentId: Map<string, string>; byEmail: Map<string, string> },
  existing: ExistingAssignment[],
): ImportPlan {
  const plan: ImportPlan = { inserts: [], updates: [], unchanged: 0, unknown: [], duplicates: [] };
  const seen = new Map<string, number>();
  const openByUser = new Map(existing.map((a) => [a.userId, a]));
  for (const row of rows) {
    const userId = (row.studentId && lookup.byStudentId.get(row.studentId)) || (row.email && lookup.byEmail.get(row.email)) || null;
    if (!userId) {
      plan.unknown.push({ line: row.line, message: "No Rumi student with this ID or email. Not created." });
      continue;
    }
    if (seen.has(userId)) {
      plan.duplicates.push({ line: row.line, message: `Same student as line ${seen.get(userId)}. Skipped.` });
      continue;
    }
    seen.set(userId, row.line);
    const externalRef = row.studentId ?? `email:${row.email}`;
    const current = openByUser.get(userId);
    if (!current) plan.inserts.push({ ...row, userId, externalRef });
    else if (current.building === row.building && current.room === row.room && current.bed === row.bed) plan.unchanged += 1;
    else plan.updates.push({ ...row, userId, externalRef, assignmentId: current.id });
  }
  return plan;
}
