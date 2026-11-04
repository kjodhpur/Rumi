"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { deletePilotCohort, endPilot, savePilotCohort, savePilotConfig } from "@/app/actions/pilot";

type Metric = "onboardedPct" | "matchedPct" | "agreementPct" | "roomChangePct";
const METRICS: { key: Metric; label: string; hint: string }[] = [
  { key: "onboardedPct", label: "Finished profiles", hint: "% of students in scope" },
  { key: "matchedPct", label: "In a pair or group", hint: "% of finished profiles" },
  { key: "agreementPct", label: "Signed agreements", hint: "% of groups" },
  { key: "roomChangePct", label: "Room changes at most", hint: "% of assigned students" },
];

export interface PilotView {
  residentialColleges: string[];
  startsOn: string;
  endsOn: string;
  metrics: Partial<Record<Metric, number | null>>;
}

export interface CohortView {
  id: string;
  name: string;
  arm: "rumi" | "control";
  termId: string | null;
  residentialColleges: string[];
  buildings: string[];
}

function useRun() {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const run = async (
    key: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
  ) => {
    setPending(key);
    const r = await fn();
    setPending(null);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success(done);
    router.refresh();
    return true;
  };
  return { pending, run };
}

function CollegePicker({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  if (!options.length)
    return (
      <p className="text-body-sm text-ink-3">
        Add residential colleges under Term → Matching rules first.
      </p>
    );
  return (
    <fieldset>
      <legend className="mb-2 text-body-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2.5 rounded-md bg-surface-sunken px-3 py-2 text-body-sm text-ink"
          >
            <Checkbox
              checked={value.includes(o.value)}
              onCheckedChange={(v) =>
                onChange(v === true ? [...value, o.value] : value.filter((x) => x !== o.value))
              }
              aria-label={o.label}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PilotManager({
  schoolId,
  pilot,
  colleges,
  today,
}: {
  schoolId: string;
  pilot: PilotView | null;
  colleges: { value: string; label: string }[];
  today: string;
}) {
  const { pending, run } = useRun();
  const [scope, setScope] = React.useState(pilot?.residentialColleges ?? []);
  const [startsOn, setStartsOn] = React.useState(pilot?.startsOn ?? today);
  const [endsOn, setEndsOn] = React.useState(pilot?.endsOn ?? "");
  const [metrics, setMetrics] = React.useState<Record<Metric, string>>(
    () =>
      Object.fromEntries(
        METRICS.map((m) => [
          m.key,
          pilot?.metrics[m.key] == null ? "" : String(pilot.metrics[m.key]),
        ]),
      ) as Record<Metric, string>,
  );
  const status = !pilot
    ? null
    : today < pilot.startsOn
      ? "Starts soon"
      : today > pilot.endsOn
        ? "Ended"
        : "Running";

  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="pilot-title"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="pilot-title" className="text-body font-semibold text-ink">
          Pilot
        </h2>
        {status ? (
          <Badge variant={status === "Running" ? "success" : "neutral"}>{status}</Badge>
        ) : null}
      </div>
      <p className="mt-1 text-body-sm text-ink-2">
        While a pilot runs, only students in the chosen residential colleges are matched and counted
        on your dashboards. Leave every box empty to include everyone.
      </p>
      <div className="mt-5 flex flex-col gap-5">
        <CollegePicker
          options={colleges}
          value={scope}
          onChange={setScope}
          label="Residential colleges in the pilot"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            )}
          </Field>
          <Field label="Ends">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            )}
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium text-ink">Success targets</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {METRICS.map((m) => (
              <Field key={m.key} label={m.label} hint={m.hint} aside="Optional">
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    inputMode="numeric"
                    value={metrics[m.key]}
                    onChange={(e) =>
                      setMetrics((x) => ({
                        ...x,
                        [m.key]: e.target.value.replace(/\D/g, "").slice(0, 3),
                      }))
                    }
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button
            loading={pending === "save"}
            disabled={!startsOn || !endsOn}
            onClick={() =>
              void run(
                "save",
                () =>
                  savePilotConfig({
                    schoolId,
                    residentialColleges: scope,
                    startsOn,
                    endsOn,
                    metrics: Object.fromEntries(
                      METRICS.map((m) => [
                        m.key,
                        metrics[m.key] === "" ? null : Math.min(100, Number(metrics[m.key])),
                      ]),
                    ) as Record<Metric, number | null>,
                  }),
                "Pilot saved. Matches are updating.",
              )
            }
          >
            Save pilot
          </Button>
          {pilot ? (
            <Button
              variant="ghost"
              loading={pending === "end"}
              onClick={() =>
                void run(
                  "end",
                  () => endPilot(schoolId),
                  "Pilot removed. Everyone is included again.",
                )
              }
            >
              Remove pilot
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CohortManager({
  schoolId,
  cohorts,
  colleges,
  terms,
}: {
  schoolId: string;
  cohorts: CohortView[];
  colleges: { value: string; label: string }[];
  terms: { id: string; name: string }[];
}) {
  const { pending, run } = useRun();
  const [editing, setEditing] = React.useState<CohortView | null>(null);
  const blank: CohortView = {
    id: "",
    name: "",
    arm: "rumi",
    termId: terms[0]?.id ?? null,
    residentialColleges: [],
    buildings: [],
  };
  const label = (v: string) => colleges.find((c) => c.value === v)?.label ?? v;

  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="cohorts-title"
    >
      <h2 id="cohorts-title" className="text-body font-semibold text-ink">
        Comparison groups
      </h2>
      <p className="mt-1 text-body-sm text-ink-2">
        For the outcomes report: which residential colleges or buildings matched with Rumi, and
        which you&apos;re comparing against.
      </p>
      {cohorts.length ? (
        <ul className="mt-4 divide-y divide-line rounded-lg ring-1 ring-line">
          {cohorts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Badge variant={c.arm === "rumi" ? "accent" : "neutral"}>
                {c.arm === "rumi" ? "Rumi" : "Comparison"}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{c.name}</p>
                <p className="truncate text-caption text-ink-3">
                  {[...c.residentialColleges.map(label), ...c.buildings].join(", ")}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                Edit
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${c.name}`}
                loading={pending === `d-${c.id}`}
                onClick={() =>
                  void run(`d-${c.id}`, () => deletePilotCohort(schoolId, c.id), "Group removed")
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button className="mt-4" variant="secondary" onClick={() => setEditing(blank)}>
        <Plus aria-hidden /> Add a group
      </Button>
      {editing ? (
        <CohortSheet
          key={editing.id || "new"}
          schoolId={schoolId}
          cohort={editing}
          colleges={colleges}
          terms={terms}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function CohortSheet({
  schoolId,
  cohort,
  colleges,
  terms,
  onClose,
}: {
  schoolId: string;
  cohort: CohortView;
  colleges: { value: string; label: string }[];
  terms: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { pending, run } = useRun();
  const [c, setC] = React.useState(cohort);
  const [buildings, setBuildings] = React.useState(cohort.buildings.join(", "));
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={cohort.id ? "Edit group" : "Add a group"}
      footer={
        <Button
          block
          loading={pending === "save"}
          onClick={() =>
            void run(
              "save",
              () =>
                savePilotCohort({
                  schoolId,
                  id: c.id || undefined,
                  name: c.name,
                  arm: c.arm,
                  termId: c.termId,
                  residentialColleges: c.residentialColleges,
                  buildings: buildings
                    .split(",")
                    .map((b) => b.trim())
                    .filter(Boolean),
                }),
              "Group saved",
            ).then((done) => done && onClose())
          }
        >
          Save group
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Name">
          {({ id }) => (
            <Input
              id={id}
              value={c.name}
              maxLength={80}
              onChange={(e) => setC({ ...c, name: e.target.value })}
              placeholder="Fall pilot halls"
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Group">
            {({ id }) => (
              <Select
                id={id}
                value={c.arm}
                onChange={(e) =>
                  setC({ ...c, arm: e.target.value === "control" ? "control" : "rumi" })
                }
              >
                <option value="rumi">Matched with Rumi</option>
                <option value="control">Comparison (usual process)</option>
              </Select>
            )}
          </Field>
          <Field label="Term">
            {({ id }) => (
              <Select
                id={id}
                value={c.termId ?? ""}
                onChange={(e) => setC({ ...c, termId: e.target.value || null })}
              >
                <option value="">Every term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <CollegePicker
          options={colleges}
          value={c.residentialColleges}
          onChange={(v) => setC({ ...c, residentialColleges: v })}
          label="Residential colleges"
        />
        <Field
          label="Buildings"
          hint="Comma-separated, as they appear in your assignments."
          aside="Optional"
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={buildings}
              onChange={(e) => setBuildings(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Sheet>
  );
}
