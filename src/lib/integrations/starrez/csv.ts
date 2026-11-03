/**
 * StarRez roommate-group export: the fields Rumi can provide, a configurable
 * column mapping, and a safe CSV writer. Pure, so the format is unit-tested.
 * Field names are configurable because every school's StarRez import differs.
 */

export const EXPORT_FIELDS = {
  studentId: "Student ID",
  email: "School email",
  firstName: "First name",
  lastInitial: "Last initial",
  groupName: "Group name",
  groupId: "Rumi group ID",
  groupLeader: "Group leader (Y/N)",
  groupSize: "Group size",
  term: "Term",
} as const;
export type ExportField = keyof typeof EXPORT_FIELDS;

export interface ExportColumn {
  field: ExportField;
  header: string;
}

export const DEFAULT_MAPPING: ExportColumn[] = [
  { field: "studentId", header: "EntryID" },
  { field: "email", header: "Email" },
  { field: "groupName", header: "GroupName" },
  { field: "groupLeader", header: "GroupLeader" },
  { field: "groupSize", header: "GroupSize" },
  { field: "term", header: "Term" },
];

export type ExportRow = Record<ExportField, string>;

export function isExportField(value: string): value is ExportField {
  return value in EXPORT_FIELDS;
}

/** A saved mapping, cleaned: known fields only, no duplicates, sensible headers. */
export function parseMapping(value: unknown): ExportColumn[] {
  if (!Array.isArray(value)) return DEFAULT_MAPPING;
  const seen = new Set<string>();
  const columns: ExportColumn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { field, header } = item as { field?: unknown; header?: unknown };
    if (typeof field !== "string" || !isExportField(field) || seen.has(field)) continue;
    const clean = typeof header === "string" ? header.replace(/[\r\n,"]/g, " ").trim().slice(0, 60) : "";
    columns.push({ field, header: clean || EXPORT_FIELDS[field] });
    seen.add(field);
  }
  return columns.length ? columns : DEFAULT_MAPPING;
}

/**
 * One CSV cell. Quotes when needed (RFC 4180) and defuses spreadsheet formulas:
 * a value starting with = + - @ (or a tab/CR) would otherwise run when opened in Excel.
 */
export function csvCell(value: string) {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(columns: ExportColumn[], rows: ExportRow[]) {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.field] ?? "")).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
