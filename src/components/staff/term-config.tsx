"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  retireSchoolQuestion,
  saveNudgeRule,
  saveSchoolOptions,
  saveSchoolQuestion,
  saveSchoolRules,
  saveTermConfig,
  startNextTerm,
} from "@/app/actions/school-config";
import {
  DEADLINE_NAME,
  type DeadlineKey,
  type NudgeRule,
  type ScheduledSend,
} from "@/lib/notifications/deadline-nudges";
import {
  FACTOR_LABELS,
  IMPORTANCE,
  WEIGHTED_FACTORS,
  type FactorKey,
  type Importance,
} from "@/lib/options";
import type { Question } from "@/lib/matching/scenarios";
import type { TermConfig } from "@/lib/staff/term-config";

function useRun() {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const run = async (
    key: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) => {
    setPending(key);
    const r = await fn();
    setPending(null);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  };
  return { pending, run };
}

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// ─────────────────────────────────────────────────────────────────────────────

export function NudgeSettings({
  schoolId,
  rules,
  schedule,
}: {
  schoolId: string;
  rules: NudgeRule[];
  schedule: ScheduledSend[];
}) {
  const { pending, run } = useRun();
  const [offsets, setOffsets] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(rules.map((r) => [r.deadlineKey, r.offsets.join(", ")])),
  );
  if (!rules.length)
    return (
      <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">
        Add deadlines on the Dates tab and reminders appear here.
      </p>
    );
  const parse = (v: string) =>
    v
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 60);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-ink-2">
        In-app and email reminders (plus text and push for students who turned them on) at these
        days before each deadline, to students it applies to: not yet in a pair or group, or with an
        unsigned agreement. Nobody gets the same reminder twice.
      </p>
      <ul className="flex flex-col gap-3">
        {rules.map((r) => (
          <li
            key={r.deadlineKey}
            className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4 ring-1 ring-line"
          >
            <div className="min-w-[180px] flex-1">
              <p className="text-body-sm font-medium text-ink">{DEADLINE_NAME[r.deadlineKey]}</p>
              <label className="mt-2 flex items-center gap-2 text-caption text-ink-2">
                <Switch
                  checked={!r.paused}
                  aria-label={`${DEADLINE_NAME[r.deadlineKey]} reminders on`}
                  onCheckedChange={(on) =>
                    void run(
                      r.deadlineKey,
                      () =>
                        saveNudgeRule({
                          schoolId,
                          deadlineKey: r.deadlineKey,
                          offsets: r.offsets,
                          paused: !on,
                        }),
                      on ? "Reminders on" : "Reminders paused",
                    )
                  }
                />
                {r.paused ? "Paused" : "On"}
              </label>
            </div>
            <Field label="Days before" hint="Comma-separated, e.g. 7, 2, 0" className="w-48">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={offsets[r.deadlineKey] ?? ""}
                  onChange={(e) => setOffsets((o) => ({ ...o, [r.deadlineKey]: e.target.value }))}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              loading={pending === `o-${r.deadlineKey}`}
              onClick={() =>
                void run(
                  `o-${r.deadlineKey}`,
                  () =>
                    saveNudgeRule({
                      schoolId,
                      deadlineKey: r.deadlineKey,
                      offsets: parse(offsets[r.deadlineKey] ?? ""),
                      paused: r.paused,
                    }),
                  "Saved",
                )
              }
            >
              Save
            </Button>
          </li>
        ))}
      </ul>
      <section aria-labelledby="schedule-title">
        <h2
          id="schedule-title"
          className="text-caption font-semibold tracking-wide text-ink-3 uppercase"
        >
          Schedule
        </h2>
        <table className="mt-2 w-full overflow-hidden rounded-xl bg-surface text-left text-body-sm ring-1 ring-line">
          <caption className="sr-only">Reminder schedule</caption>
          <thead className="text-caption text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Sends
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Deadline
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schedule.map((s) => (
              <tr key={`${s.deadlineKey}-${s.offset}`}>
                <td className="px-4 py-2 text-ink tabular-nums">{fmt(s.date)}</td>
                <td className="px-4 py-2 text-ink-2">
                  {DEADLINE_NAME[s.deadlineKey]} (
                  {s.offset === 0 ? "day of" : `${s.offset} days before`})
                </td>
                <td className="px-4 py-2 text-right">
                  <Badge variant={s.paused ? "warning" : s.past ? "neutral" : "accent"}>
                    {s.paused ? "Paused" : s.past ? "Sent" : "Scheduled"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ChoiceDraft {
  key: string;
  label: string;
  value: number;
  reason: string;
}

export function QuestionBank({
  schoolId,
  questions,
  config,
}: {
  schoolId: string;
  questions: Question[];
  config: TermConfig;
}) {
  const { pending, run } = useRun();
  const [editing, setEditing] = React.useState<Question | "new" | null>(null);
  const [required, setRequired] = React.useState<string[]>(config.requiredQuestions);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-ink-2">
        Your own questions, shown to students after Rumi&apos;s defaults (up to eight scenarios a
        term). Each answer sits on a factor&apos;s 1–5 scale. Questions about protected
        characteristics (race, religion, national origin, disability, family status and others) are
        blocked, and you confirm a Fair Housing review before students see one.
      </p>
      {questions.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {questions.map((q) => (
            <li key={q.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Checkbox
                checked={required.includes(q.key)}
                aria-label={`Require “${q.stem}”`}
                onCheckedChange={(v) =>
                  setRequired((list) =>
                    v === true ? [...list, q.key] : list.filter((k) => k !== q.key),
                  )
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{q.stem}</p>
                <p className="text-caption text-ink-3">
                  {q.kind} · {FACTOR_LABELS[q.factor as FactorKey]} · version {q.version}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(q)}>
                Edit
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Retire “${q.stem}”`}
                loading={pending === `r-${q.key}`}
                onClick={() =>
                  void run(
                    `r-${q.key}`,
                    () => retireSchoolQuestion(schoolId, q.key),
                    "Question retired",
                  )
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add a question
        </Button>
        {questions.length ? (
          <Button
            loading={pending === "required"}
            onClick={() =>
              void run(
                "required",
                () =>
                  saveTermConfig({
                    schoolId,
                    requiredQuestions: required,
                    maxImportance: config.maxImportance,
                  }),
                "Required questions saved",
              )
            }
          >
            Save required questions
          </Button>
        ) : null}
      </div>
      <QuestionSheet schoolId={schoolId} question={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function QuestionSheet({
  schoolId,
  question,
  onClose,
}: {
  schoolId: string;
  question: Question | "new" | null;
  onClose: () => void;
}) {
  const { pending, run } = useRun();
  const existing = question && question !== "new" ? question : null;
  const [key, setKey] = React.useState("");
  const [kind, setKind] = React.useState<Question["kind"]>("scenario");
  const [factor, setFactor] = React.useState<Question["factor"]>("noise");
  const [stem, setStem] = React.useState("");
  const [choices, setChoices] = React.useState<ChoiceDraft[]>([]);
  const [reviewed, setReviewed] = React.useState(false);

  React.useEffect(() => {
    if (!question) return;
    setKey(existing?.key ?? "");
    setKind(existing?.kind ?? "scenario");
    setFactor(existing?.factor ?? "noise");
    setStem(existing?.stem ?? "");
    setChoices(
      existing?.choices.map((c) => ({ ...c })) ?? [
        { key: "a", label: "", value: 1, reason: "" },
        { key: "b", label: "", value: 5, reason: "" },
      ],
    );
    setReviewed(false);
  }, [question, existing]);

  async function save() {
    if (!reviewed) return;
    const ok = await run(
      "save",
      async () => {
        const r = await saveSchoolQuestion({
          schoolId,
          key,
          kind,
          factor,
          stem,
          choices,
          reviewed: true,
        });
        return r.ok ? { ok: true as const } : r;
      },
      existing
        ? "Saved as a new version. Old answers stop counting until re-answered."
        : "Question added",
    );
    if (ok) onClose();
  }

  return (
    <Sheet
      open={Boolean(question)}
      onOpenChange={(o) => !o && onClose()}
      title={existing ? "Edit question" : "Add a question"}
      description="Write it as an everyday situation. Each answer maps to a spot on the factor's 1–5 scale."
      size="lg"
      footer={
        <Button block loading={pending === "save"} disabled={!reviewed} onClick={() => void save()}>
          Save question
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code" hint="Lowercase, e.g. late_music">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={key}
                disabled={Boolean(existing)}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
              />
            )}
          </Field>
          <Field label="Type">
            {({ id }) => (
              <Select
                id={id}
                value={kind}
                onChange={(e) => setKind(e.target.value as Question["kind"])}
              >
                <option value="scenario">Scenario</option>
                <option value="scale">Scale</option>
                <option value="choice">Choice</option>
              </Select>
            )}
          </Field>
          <Field label="Factor">
            {({ id }) => (
              <Select
                id={id}
                value={factor}
                onChange={(e) => setFactor(e.target.value as Question["factor"])}
              >
                {(["sleep", "cleanliness", "noise", "guests", "study"] as const).map((f) => (
                  <option key={f} value={f}>
                    {FACTOR_LABELS[f]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Question">
          {({ id }) => (
            <Input
              id={id}
              value={stem}
              maxLength={250}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Your roommate plays music at 10pm on a weeknight."
            />
          )}
        </Field>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-body-sm font-medium text-ink">Answers</legend>
          {choices.map((c, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md bg-surface-sunken p-3 sm:grid-cols-[1fr_88px_1fr_auto]"
            >
              <Input
                aria-label="Answer"
                placeholder="Answer"
                value={c.label}
                maxLength={100}
                onChange={(e) =>
                  setChoices((l) =>
                    l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  )
                }
              />
              <Select
                aria-label="Value on the 1–5 scale"
                value={String(c.value)}
                onChange={(e) =>
                  setChoices((l) =>
                    l.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)),
                  )
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Shared-answer reason"
                placeholder="Why you match, if both pick it"
                value={c.reason}
                maxLength={120}
                onChange={(e) =>
                  setChoices((l) =>
                    l.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)),
                  )
                }
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove answer"
                disabled={choices.length <= 2}
                onClick={() => setChoices((l) => l.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          {choices.length < 5 ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                setChoices((l) => [
                  ...l,
                  {
                    key: "abcde".split("").find((k) => !l.some((c) => c.key === k)) ?? "e",
                    label: "",
                    value: 3,
                    reason: "",
                  },
                ])
              }
            >
              <Plus aria-hidden /> Answer
            </Button>
          ) : null}
        </fieldset>
        <label className="flex items-start gap-3 rounded-md bg-warning-soft p-3 text-body-sm text-ink">
          <Checkbox
            checked={reviewed}
            onCheckedChange={(v) => setReviewed(v === true)}
            aria-label="I reviewed this question for Fair Housing"
            className="mt-0.5"
          />
          <span>
            I reviewed this question and its answers for Fair Housing. It doesn&apos;t ask about, or
            stand in for, a protected characteristic.
          </span>
        </label>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export interface OptionView {
  kind: "academic_college" | "residential_college" | "llc" | "campus";
  value: string;
  label: string;
  active: boolean;
}

const OPTION_KIND_LABEL: Record<OptionView["kind"], string> = {
  campus: "Campuses",
  academic_college: "Academic colleges",
  residential_college: "Residential colleges",
  llc: "Living learning communities",
};
const RULES = [
  {
    type: "freshman_same_college",
    label: "First-year students match within the same academic college",
  },
  { type: "same_academic_college", label: "Everyone matches within the same academic college" },
  { type: "same_residential_college", label: "Students match within the same residential college" },
  { type: "llc_exclusive", label: "LLC members match only inside their LLC" },
] as const;

export function MatchingRules({
  schoolId,
  rules,
  mergeTrackPools,
  options,
  config,
}: {
  schoolId: string;
  rules: { type: string; active: boolean }[];
  mergeTrackPools: boolean;
  options: OptionView[];
  config: TermConfig;
}) {
  const { pending, run } = useRun();
  const [active, setActive] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      RULES.map((r) => [r.type, rules.find((x) => x.type === r.type)?.active ?? false]),
    ),
  );
  const [merge, setMerge] = React.useState(mergeTrackPools);
  const [limits, setLimits] = React.useState<Partial<Record<FactorKey, Importance>>>(() =>
    Object.fromEntries(WEIGHTED_FACTORS.map((f) => [f, config.maxImportance[f] ?? 3])),
  );
  const [lists, setLists] = React.useState<Record<OptionView["kind"], OptionView[]>>(() => ({
    campus: options.filter((o) => o.kind === "campus"),
    academic_college: options.filter((o) => o.kind === "academic_college"),
    residential_college: options.filter((o) => o.kind === "residential_college"),
    llc: options.filter((o) => o.kind === "llc"),
  }));

  return (
    <div className="flex flex-col gap-8">
      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="rules-title"
      >
        <h2 id="rules-title" className="text-body font-semibold text-ink">
          Housing rules
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          Extra hard filters in matching and auto-pair. A rule only applies when both students
          picked a value. Saving re-ranks everyone.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {RULES.map((r) => (
            <li key={r.type}>
              <label className="flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
                {r.label}
                <Switch
                  checked={active[r.type]}
                  onCheckedChange={(v) => setActive((a) => ({ ...a, [r.type]: v }))}
                  aria-label={r.label}
                />
              </label>
            </li>
          ))}
          <li>
            <label className="flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
              <span>
                Mix tracks
                <span className="block text-caption text-ink-3">
                  By default first-year, returning, transfer and grad students match within their
                  own track.
                </span>
              </span>
              <Switch checked={merge} onCheckedChange={setMerge} aria-label="Mix tracks" />
            </label>
          </li>
        </ul>
        <Button
          className="mt-4"
          loading={pending === "rules"}
          onClick={() =>
            void run(
              "rules",
              () =>
                saveSchoolRules({
                  schoolId,
                  rules: RULES.map((r) => ({ type: r.type, active: active[r.type] ?? false })),
                  mergeTrackPools: merge,
                }),
              "Rules saved. Matches are updating.",
            )
          }
        >
          Save rules
        </Button>
      </section>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="limits-title"
      >
        <h2 id="limits-title" className="text-body font-semibold text-ink">
          How much each factor can matter
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          The highest importance students may give a factor. Students still set their own within it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WEIGHTED_FACTORS.map((f) => (
            <Field key={f} label={FACTOR_LABELS[f]}>
              {({ id }) => (
                <Select
                  id={id}
                  value={String(limits[f] ?? 3)}
                  onChange={(e) =>
                    setLimits((l) => ({ ...l, [f]: Number(e.target.value) as Importance }))
                  }
                >
                  {IMPORTANCE.map((i) => (
                    <option key={i.value} value={i.value}>
                      Up to “{i.label}”
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ))}
        </div>
        <Button
          className="mt-4"
          loading={pending === "limits"}
          onClick={() =>
            void run(
              "limits",
              () =>
                saveTermConfig({
                  schoolId,
                  requiredQuestions: config.requiredQuestions,
                  maxImportance: limits,
                }),
              "Saved. Matches are updating.",
            )
          }
        >
          Save limits
        </Button>
      </section>

      {(Object.keys(OPTION_KIND_LABEL) as OptionView["kind"][]).map((kind) => (
        <section
          key={kind}
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
          aria-labelledby={`opt-${kind}`}
        >
          <h2 id={`opt-${kind}`} className="text-body font-semibold text-ink">
            {OPTION_KIND_LABEL[kind]}
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            What students can pick in their profile. Turn an option off instead of deleting it.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {lists[kind].map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Code"
                  value={o.value}
                  className="w-40"
                  disabled={options.some((x) => x.kind === kind && x.value === o.value)}
                  onChange={(e) =>
                    setLists((l) => ({
                      ...l,
                      [kind]: l[kind].map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                            }
                          : x,
                      ),
                    }))
                  }
                />
                <Input
                  aria-label="Label"
                  value={o.label}
                  className="min-w-[180px] flex-1"
                  onChange={(e) =>
                    setLists((l) => ({
                      ...l,
                      [kind]: l[kind].map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    }))
                  }
                />
                <Switch
                  checked={o.active}
                  aria-label={`${o.label || o.value} available`}
                  onCheckedChange={(v) =>
                    setLists((l) => ({
                      ...l,
                      [kind]: l[kind].map((x, j) => (j === i ? { ...x, active: v } : x)),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLists((l) => ({
                  ...l,
                  [kind]: [...l[kind], { kind, value: "", label: "", active: true }],
                }))
              }
            >
              <Plus aria-hidden /> Add
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={pending === kind}
              onClick={() =>
                void run(
                  kind,
                  () =>
                    saveSchoolOptions({
                      schoolId,
                      kind,
                      options: lists[kind].filter((o) => o.value && o.label),
                    }),
                  "Saved",
                )
              }
            >
              Save
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function NextTermButton({ schoolId }: { schoolId: string }) {
  const { pending, run } = useRun();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [startsOn, setStartsOn] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Start the next term
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Start the next term"
        description="The current term closes. Its end-of-term answers let returning groups keep their group. Questions and limits carry over; add the new deadlines after."
        footer={
          <Button
            block
            loading={pending === "next"}
            onClick={() =>
              void run(
                "next",
                () => startNextTerm({ schoolId, name, startsOn, endsOn }),
                "New term started",
              ).then((ok) => ok && setOpen(false))
            }
          >
            Start term
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name">
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fall 2027"
                maxLength={60}
              />
            )}
          </Field>
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
        </div>
      </Sheet>
    </>
  );
}

export type { DeadlineKey };
