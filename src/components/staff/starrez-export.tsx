"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, FileSpreadsheet, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { saveExportMapping } from "@/app/actions/staff-dashboard";
import { EXPORT_FIELDS, type ExportColumn, type ExportField } from "@/lib/integrations/starrez/csv";
import type { ExportPreview } from "@/lib/integrations/starrez/export";

interface Row {
  field: ExportField;
  header: string;
  included: boolean;
}

/** "Rumi group ID" → "RumiGroupID": the header style StarRez imports usually use. */
const pascal = (label: string) =>
  label
    .replace(/\(.*?\)/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");

function toRows(columns: ExportColumn[]): Row[] {
  const included = columns.map((c) => ({ field: c.field, header: c.header, included: true }));
  const rest = (Object.keys(EXPORT_FIELDS) as ExportField[])
    .filter((f) => !columns.some((c) => c.field === f))
    .map((f) => ({ field: f, header: pascal(EXPORT_FIELDS[f]), included: false }));
  return [...included, ...rest];
}

export function StarRezExport({ schoolId, preview }: { schoolId: string; preview: ExportPreview }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(() => toRows(preview.columns));
  const [saving, setSaving] = React.useState(false);
  const saved = JSON.stringify(preview.columns);
  const current = rows
    .filter((r) => r.included)
    .map((r) => ({ field: r.field, header: r.header.trim() || EXPORT_FIELDS[r.field] }));
  const dirty = JSON.stringify(current) !== saved;

  function update(index: number, patch: Partial<Row>) {
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function move(index: number, by: -1 | 1) {
    setRows((list) => {
      const next = [...list];
      const target = index + by;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const result = await saveExportMapping({ schoolId, columns: current });
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Columns saved");
    router.refresh();
  }

  const previewColumns = preview.columns;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="StarRez export"
        description="Approved pairings as a roommate-group CSV for your StarRez import. Every export is recorded in the audit log."
        className="pb-0 lg:pb-0"
        actions={
          <Button
            asChild={!dirty && preview.rows.length > 0}
            disabled={dirty || preview.rows.length === 0}
          >
            {!dirty && preview.rows.length > 0 ? (
              <a href="/api/staff/starrez" download>
                <Download aria-hidden /> Download CSV
              </a>
            ) : (
              <span>
                <Download aria-hidden /> Download CSV
              </span>
            )}
          </Button>
        }
      />
      {dirty ? (
        <p className="-mt-3 text-caption text-ink-3">Save your column changes to download.</p>
      ) : null}

      {preview.missingStudentIds > 0 || preview.skipped.length > 0 ? (
        <div
          role="note"
          className="flex gap-3 rounded-lg bg-surface p-4 text-body-sm text-ink-2 ring-1 ring-line"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
          <ul className="flex flex-col gap-1">
            {preview.missingStudentIds > 0 ? (
              <li>
                {preview.missingStudentIds}{" "}
                {preview.missingStudentIds === 1 ? "student hasn't" : "students haven't"} added a
                student ID. Their rows use email only.
              </li>
            ) : null}
            {preview.skipped.length > 0 ? (
              <li>
                {preview.skipped.length} approved{" "}
                {preview.skipped.length === 1 ? "group is" : "groups are"} left out:{" "}
                {preview.skipped
                  .map(
                    (s) =>
                      `${s.name} (${s.reason === "not_shared" ? "not every member shared" : "members changed since approval"})`,
                  )
                  .join(", ")}
                .
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <section aria-labelledby="columns-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="columns-title" className="text-title font-semibold text-ink">
              Columns
            </h2>
            <p className="mt-0.5 text-body-sm text-ink-2">
              Match the headers your StarRez import expects. Confirm the field names with your
              StarRez administrator.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={!dirty || current.length === 0}
            loading={saving}
            onClick={() => void save()}
          >
            Save columns
          </Button>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
          {rows.map((row, i) => (
            <li
              key={row.field}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3 text-body-sm text-ink">
                <Checkbox
                  checked={row.included}
                  onCheckedChange={(v) => update(i, { included: v === true })}
                />
                <span className="truncate">{EXPORT_FIELDS[row.field]}</span>
              </label>
              <Input
                aria-label={`CSV header for ${EXPORT_FIELDS[row.field]}`}
                value={row.header}
                onChange={(e) => update(i, { header: e.target.value })}
                disabled={!row.included}
                maxLength={60}
                className="w-full sm:w-56"
              />
              <span className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${EXPORT_FIELDS[row.field]} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${EXPORT_FIELDS[row.field]} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="preview-title" className="flex flex-col gap-3">
        <h2 id="preview-title" className="text-title font-semibold text-ink">
          Preview{" "}
          <span className="text-body-sm font-normal text-ink-3">
            {preview.groups} {preview.groups === 1 ? "group" : "groups"} · {preview.rows.length}{" "}
            {preview.rows.length === 1 ? "student" : "students"}
          </span>
        </h2>
        {preview.rows.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet strokeWidth={1.75} />}
            title="Nothing to export yet"
            description="Approve pairings on the Pairings page. Groups appear here once every member has chosen to share."
          />
        ) : (
          <div
            role="region"
            tabIndex={0}
            aria-label="Export preview"
            className="overflow-x-auto rounded-xl bg-surface shadow-xs ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <table className="w-full min-w-[640px] text-left text-body-sm">
              <caption className="sr-only">First rows of the export with the saved columns</caption>
              <thead className="border-b border-line bg-surface-sunken/60 text-caption text-ink-3">
                <tr>
                  {previewColumns.map((c) => (
                    <th key={c.field} scope="col" className="px-4 py-2.5 font-mono font-medium">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.slice(0, 20).map((r, i) => (
                  <tr key={`${r.groupId}-${i}`}>
                    {previewColumns.map((c) => (
                      <td
                        key={c.field}
                        className="px-4 py-2.5 whitespace-nowrap text-ink-2 tabular-nums"
                      >
                        {r[c.field] || <span className="text-ink-3">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 20 ? (
              <p className="border-t border-line px-4 py-2.5 text-caption text-ink-3">
                And {preview.rows.length - 20} more rows in the download.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
