"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileUp, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/relative-time";
import { importAssignmentsCsv, saveAssignmentMapping, undoLastImport, type ImportPreview } from "@/app/actions/starrez";
import { ASSIGNMENT_FIELDS, ASSIGNMENT_FIELD_LABEL, type AssignmentField, type AssignmentMapping } from "@/lib/integrations/starrez/import";
import { decodeCsvBytes, csvLine } from "@/lib/csv/parse";

export interface ImportJobView {
  id: string;
  kind: "assignments" | "questionnaire";
  fileName: string | null;
  status: "dry_run" | "completed" | "failed" | "undone";
  createdAt: string;
  inserts: number;
  updates: number;
  errors: number;
}

const STATUS = { completed: "success", failed: "danger", undone: "neutral", dry_run: "neutral" } as const;

function downloadErrors(errors: { line: number; message: string }[], name: string) {
  const text = [csvLine(["Line", "Problem"]), ...errors.map((e) => csvLine([String(e.line), e.message]))].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Phase 2a import: current assignments from the housing system, with preview and undo. */
export function StarRezImport({ schoolId, mapping, jobs }: { schoolId: string; mapping: AssignmentMapping; jobs: ImportJobView[] }) {
  const router = useRouter();
  const [file, setFile] = React.useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [columns, setColumns] = React.useState(mapping);
  const lastCompleted = jobs.find((j) => j.kind === "assignments" && j.status === "completed");

  async function choose(f: File | undefined) {
    setPreview(null);
    if (!f) return setFile(null);
    if (f.size > 5_000_000) return void toast.error("That file is too big. Split it into files under 5 MB.");
    setFile({ name: f.name, text: decodeCsvBytes(new Uint8Array(await f.arrayBuffer())) });
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setPending(dryRun ? "preview" : "import");
    const result = await importAssignmentsCsv({ schoolId, fileName: file.name, text: file.text, dryRun });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    setPreview(result.data);
    if (!dryRun) {
      toast.success(`Imported: ${result.data.inserts} new, ${result.data.updates} moved, ${result.data.unchanged} unchanged`);
      setFile(null);
      router.refresh();
    }
  }

  async function undo(jobId: string) {
    setPending("undo");
    const result = await undoLastImport(schoolId, jobId);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Import undone");
    router.refresh();
  }

  async function saveColumns() {
    setPending("columns");
    const result = await saveAssignmentMapping({ schoolId, mapping: columns });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Column names saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="import-title">
        <h2 id="import-title" className="text-body font-semibold text-ink">Import current assignments</h2>
        <p className="mt-1 text-body-sm text-ink-2">
          A CSV with student ID or email, building, room, bed and term. Students are matched to Rumi accounts; anyone not on Rumi is listed, never created. Importing the same file twice changes nothing.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="CSV file" className="min-w-[240px] flex-1">
            {({ id }) => <input id={id} type="file" accept=".csv,text/csv" onChange={(e) => void choose(e.target.files?.[0])} className="text-body-sm text-ink-2 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-surface-sunken file:px-4 file:text-body-sm file:font-medium file:text-ink" />}
          </Field>
          <Button variant="secondary" disabled={!file} loading={pending === "preview"} onClick={() => void run(true)}>
            Check file
          </Button>
          <Button disabled={!file || !preview || preview.missingColumns.length > 0} loading={pending === "import"} onClick={() => void run(false)}>
            <FileUp aria-hidden /> Import
          </Button>
        </div>

        <div aria-live="polite">
          {preview ? (
            preview.missingColumns.length ? (
              <p className="mt-4 rounded-md bg-danger-soft px-4 py-3 text-body-sm text-ink">
                Missing columns: {preview.missingColumns.map((c) => ASSIGNMENT_FIELD_LABEL[c as AssignmentField] ?? c).join(", ")}. Rename them in the file or below.
              </p>
            ) : (
              <div className="mt-4 rounded-md bg-surface-sunken p-4 text-body-sm text-ink-2">
                <p>
                  <span className="font-medium text-ink">{preview.inserts}</span> new · <span className="font-medium text-ink">{preview.updates}</span> moved · {preview.unchanged} unchanged · {preview.errors.length} problems
                </p>
                {preview.errors.length ? (
                  <>
                    <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto text-caption">
                      {preview.errors.slice(0, 50).map((e) => (
                        <li key={`${e.line}-${e.message}`}>Line {e.line}: {e.message}</li>
                      ))}
                    </ul>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => downloadErrors(preview.errors, "rumi-import-problems.csv")}>
                      <Download aria-hidden /> Download all problems
                    </Button>
                  </>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="columns-title">
        <h2 id="columns-title" className="text-body font-semibold text-ink">Column names</h2>
        <p className="mt-1 text-body-sm text-ink-2">Match your export's headers. Common alternatives (EntryID, RoomSpace…) are recognized too.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ASSIGNMENT_FIELDS.map((f) => (
            <Field key={f} label={ASSIGNMENT_FIELD_LABEL[f]}>
              {({ id }) => <Input id={id} value={columns[f]} maxLength={60} onChange={(e) => setColumns((c) => ({ ...c, [f]: e.target.value }))} />}
            </Field>
          ))}
        </div>
        <Button variant="secondary" className="mt-4" loading={pending === "columns"} onClick={() => void saveColumns()}>
          Save column names
        </Button>
      </section>

      {jobs.length ? (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="text-caption font-semibold tracking-wide text-ink-3 uppercase">Recent imports</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-body-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{j.fileName ?? (j.kind === "assignments" ? "StarRez pull" : "Questionnaire")}</span>
                <span className="text-caption text-ink-3">
                  {j.kind === "assignments" ? `${j.inserts} new · ${j.updates} moved` : "Questionnaire"} · {j.errors} problems · <RelativeTime iso={j.createdAt} />
                </span>
                <Badge variant={STATUS[j.status]}>{j.status === "dry_run" ? "Checked" : j.status === "completed" ? "Imported" : j.status === "undone" ? "Undone" : "Failed"}</Badge>
                {lastCompleted?.id === j.id ? (
                  <Button size="sm" variant="ghost" loading={pending === "undo"} onClick={() => void undo(j.id)}>
                    <Undo2 aria-hidden /> Undo
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
