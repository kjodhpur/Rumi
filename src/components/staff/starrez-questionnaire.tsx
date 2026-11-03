"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { importQuestionnaireCsv, saveQuestionnaireMapping, type QuestionnaireImportResult } from "@/app/actions/starrez";
import { FACTOR_VALUES, IMPORT_FACTORS, STARTER_QUESTIONNAIRE_MAPPING, type ImportFactor, type QuestionnaireMapping } from "@/lib/integrations/starrez/questionnaire";
import { decodeCsvBytes } from "@/lib/csv/parse";

const FACTOR_LABEL: Record<ImportFactor, string> = {
  sleep_schedule: "Sleep schedule (1 early … 5 late)",
  cleanliness: "Cleanliness (1 relaxed … 5 spotless)",
  noise: "Noise (1 quiet … 5 lively)",
  guests: "Guests (1 rarely … 5 often)",
  smoking: "Smoking",
  drinking: "Drinking",
  pets: "Pets",
  study: "Study habits",
};

interface Row {
  code: string;
  factor: ImportFactor;
  values: { raw: string; value: string }[];
}

const toRows = (m: QuestionnaireMapping): Row[] => m.questions.map((q) => ({ code: q.code, factor: q.factor, values: Object.entries(q.values).map(([raw, value]) => ({ raw, value })) }));

/**
 * Phase 2d: map housing-questionnaire codes to Rumi factors, then import. Students confirm
 * their answers in one tap before anything counts.
 */
export function StarRezQuestionnaire({ schoolId, mapping }: { schoolId: string; mapping: QuestionnaireMapping }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(() => toRows(mapping.questions.length ? mapping : { questions: [] }));
  const [file, setFile] = React.useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = React.useState<QuestionnaireImportResult | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const update = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setPending("save");
    const r = await saveQuestionnaireMapping({
      schoolId,
      questions: rows.filter((x) => x.code.trim()).map((x) => ({ code: x.code, factor: x.factor, values: Object.fromEntries(x.values.filter((v) => v.raw.trim() && v.value).map((v) => [v.raw, v.value])) })),
    });
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Mapping saved");
    router.refresh();
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setPending(dryRun ? "check" : "import");
    const r = await importQuestionnaireCsv({ schoolId, fileName: file.name, text: file.text, dryRun });
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    setResult(r.data);
    if (!dryRun) toast.success(`${r.data.stored} answers imported for ${r.data.students} students${r.data.held ? `, ${r.data.held} held until they join` : ""}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="qmap-title">
        <h2 id="qmap-title" className="text-body font-semibold text-ink">Question mapping</h2>
        <p className="mt-1 text-body-sm text-ink-2">
          Match each code in your roommate questionnaire to a Rumi factor, and each answer to a value. Confirm codes against your own export; protected topics can&apos;t be mapped.
        </p>
        {rows.length === 0 ? (
          <Button variant="secondary" className="mt-4" onClick={() => setRows(toRows(STARTER_QUESTIONNAIRE_MAPPING))}>
            Start from a common template
          </Button>
        ) : null}
        <ul className="mt-4 flex flex-col gap-4">
          {rows.map((row, i) => (
            <li key={i} className="rounded-md bg-surface-sunken p-4">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Question code" className="w-40">{({ id }) => <Input id={id} value={row.code} maxLength={80} onChange={(e) => update(i, { code: e.target.value.toUpperCase() })} />}</Field>
                <Field label="Rumi factor" className="min-w-[220px] flex-1">
                  {({ id }) => (
                    <Select id={id} value={row.factor} onChange={(e) => update(i, { factor: e.target.value as ImportFactor, values: row.values.map((x) => ({ ...x, value: "" })) })}>
                      {IMPORT_FACTORS.map((f) => (
                        <option key={f} value={f}>
                          {FACTOR_LABEL[f]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${row.code || "question"}`} onClick={() => setRows((list) => list.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {row.values.map((v, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-2">
                    <Input value={v.raw} aria-label="Their answer" placeholder="Their answer" className="w-48" maxLength={80} onChange={(e) => update(i, { values: row.values.map((x, m) => (m === k ? { ...x, raw: e.target.value } : x)) })} />
                    <span className="text-caption text-ink-3">means</span>
                    <Select aria-label="Rumi value" value={v.value} className="w-40" onChange={(e) => update(i, { values: row.values.map((x, m) => (m === k ? { ...x, value: e.target.value } : x)) })}>
                      <option value="">Pick…</option>
                      {FACTOR_VALUES[row.factor].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="self-start" onClick={() => update(i, { values: [...row.values, { raw: "", value: "" }] })}>
                  <Plus aria-hidden /> Answer
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setRows((list) => [...list, { code: "", factor: "cleanliness", values: [{ raw: "", value: "" }] }])}>
            <Plus aria-hidden /> Question
          </Button>
          <Button loading={pending === "save"} onClick={() => void save()}>
            Save mapping
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="qimport-title">
        <h2 id="qimport-title" className="text-body font-semibold text-ink">Import questionnaire answers</h2>
        <p className="mt-1 text-body-sm text-ink-2">One row per answer: StudentID or Email, QuestionCode, Answer. Students not on Rumi yet are held for 60 days, then deleted.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input type="file" accept=".csv,text/csv" aria-label="Questionnaire CSV" onChange={async (e) => { const f = e.target.files?.[0]; setResult(null); setFile(f ? { name: f.name, text: decodeCsvBytes(new Uint8Array(await f.arrayBuffer())) } : null); }} className="text-body-sm text-ink-2 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-surface-sunken file:px-4 file:text-body-sm file:font-medium file:text-ink" />
          <Button variant="secondary" disabled={!file} loading={pending === "check"} onClick={() => void run(true)}>Check file</Button>
          <Button disabled={!file} loading={pending === "import"} onClick={() => void run(false)}><FileUp aria-hidden /> Import</Button>
        </div>
        <div aria-live="polite">
          {result ? (
            <div className="mt-4 rounded-md bg-surface-sunken p-4 text-body-sm text-ink-2">
              {result.unmappedCodes.length ? <p>Codes with no mapping: {result.unmappedCodes.join(", ")}</p> : null}
              {result.unmappedValues.length ? (
                <p className="mt-1">Answers with no mapping: {result.unmappedValues.slice(0, 10).map((u) => `${u.code} “${u.value}” (${u.count})`).join(", ")}</p>
              ) : null}
              {result.errors.length ? <p className="mt-1">{result.errors.length} rows couldn&apos;t be read (first: line {result.errors[0]!.line}, {result.errors[0]!.message})</p> : null}
              {!result.unmappedCodes.length && !result.unmappedValues.length && !result.errors.length ? <p>Every row maps cleanly.</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
