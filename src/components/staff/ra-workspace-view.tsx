"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, FileText, LifeBuoy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/ui/choice";
import { RelativeTime } from "@/components/ui/relative-time";
import { addCaseNote, addCaseTask, closeCase, openCase, reopenAgreementForMediation, setCaseTaskDone } from "@/app/actions/ra-workspace";

export interface RaAlert {
  assignmentId: string;
  studentName: string;
  building: string;
  room: string | null;
  level: "low" | "medium" | "high";
  reasons: string[];
  score: number | null;
  tags: string[];
  note: string | null;
  askedForHelp: boolean;
  submittedAt: string;
  groupId: string | null;
  caseId: string | null;
  caseStatus: "open" | "resolved" | "room_change" | "escalated" | null;
  notes: { id: string; body: string; at: string; author: string }[];
  tasks: { id: string; title: string; dueOn: string | null; done: boolean }[];
}

const LEVEL = { high: { label: "High", variant: "danger" }, medium: { label: "Medium", variant: "warning" }, low: { label: "Low", variant: "neutral" } } as const;
const OUTCOME = { resolved: "Resolved", room_change: "Room change", escalated: "Escalated" } as const;

export function RaWorkspaceView({ schoolId, alerts }: { schoolId: string; alerts: RaAlert[] }) {
  const buildings = [...new Set(alerts.map((a) => a.building))].sort();
  const [building, setBuilding] = React.useState("all");
  const shown = alerts.filter((a) => building === "all" || a.building === building);

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck strokeWidth={1.75} />}
        title="No one needs a check-in right now"
        description="Alerts appear when a student in your buildings shares a rough check-in or asks for help."
      />
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {buildings.length > 1 ? (
        <ChoiceChips aria-label="Building" value={building} onValueChange={setBuilding} options={[{ value: "all", label: `All (${alerts.length})` }, ...buildings.map((b) => ({ value: b, label: b }))]} />
      ) : null}
      <ul className="flex flex-col gap-4">
        {shown.map((a) => (
          <AlertCard key={a.assignmentId} schoolId={schoolId} alert={a} />
        ))}
      </ul>
    </div>
  );
}

function AlertCard({ schoolId, alert: a }: { schoolId: string; alert: RaAlert }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [task, setTask] = React.useState("");
  const [due, setDue] = React.useState("");

  async function run(key: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setPending(key);
    const result = await fn();
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(success);
    router.refresh();
  }

  const open = a.caseStatus === "open";
  return (
    <li className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-ink">{a.studentName}</p>
          <p className="text-caption text-ink-2">
            {a.building}
            {a.room ? ` · Room ${a.room}` : ""} · <RelativeTime iso={a.submittedAt} />
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {a.askedForHelp ? <Badge variant="accent"><LifeBuoy className="size-3" aria-hidden /> Asked for help</Badge> : null}
          <Badge variant={LEVEL[a.level].variant}>{LEVEL[a.level].label} risk</Badge>
          {a.caseStatus && a.caseStatus !== "open" ? <Badge>{OUTCOME[a.caseStatus]}</Badge> : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-body-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-3">Latest score</dt>
        <dd className="text-ink tabular-nums">{a.score ?? "—"} of 5{a.tags.length ? ` · ${a.tags.join(", ")}` : ""}</dd>
        {a.reasons.length ? (
          <>
            <dt className="text-ink-3">Why flagged</dt>
            <dd className="text-ink-2">{a.reasons.join(" ")}</dd>
          </>
        ) : null}
        <dt className="text-ink-3">Note</dt>
        <dd className="text-ink-2">{a.note ?? <span className="text-ink-3">Not shared</span>}</dd>
      </dl>

      {!a.caseId || !open ? (
        <Button size="sm" className="mt-4" loading={pending === "open"} onClick={() => void run("open", async () => {
          const r = await openCase(schoolId, a.assignmentId);
          return r.ok ? { ok: true as const } : r;
        }, "Case opened")}>
          <Plus aria-hidden /> {a.caseId ? "Open a new case" : "Start a case"}
        </Button>
      ) : (
        <div className="mt-5 flex flex-col gap-5 border-t border-line pt-5">
          <section aria-label="Follow-ups">
            <h3 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">Follow-ups</h3>
            {a.tasks.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {a.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-body-sm">
                    <Checkbox
                      checked={t.done}
                      aria-label={`Mark "${t.title}" ${t.done ? "not done" : "done"}`}
                      onCheckedChange={(v) => void run(`t-${t.id}`, () => setCaseTaskDone(schoolId, a.caseId!, t.id, v === true), v === true ? "Done" : "Reopened")}
                    />
                    <span className={t.done ? "text-ink-3 line-through" : "text-ink"}>{t.title}</span>
                    {t.dueOn ? <span className="text-caption text-ink-3">due {t.dueOn}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run("task", () => addCaseTask({ school: schoolId, caseId: a.caseId!, title: task, dueOn: due }), "Follow-up added").then(() => {
                  setTask("");
                  setDue("");
                });
              }}
            >
              <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Meet both roommates Thursday" aria-label="New follow-up" className="min-w-[200px] flex-1" maxLength={160} />
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="w-auto" />
              <Button type="submit" variant="secondary" size="md" loading={pending === "task"} disabled={!task.trim()}>Add</Button>
            </form>
          </section>

          <section aria-label="Notes">
            <h3 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">Notes</h3>
            {a.notes.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {a.notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-surface-sunken p-3 text-body-sm text-ink">
                    {n.body}
                    <span className="mt-1 block text-caption text-ink-3">{n.author} · <RelativeTime iso={n.at} /></span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Textarea className="mt-3" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, what's next" aria-label="New note" maxLength={2000} />
            <Button size="sm" variant="secondary" className="mt-2" loading={pending === "note"} disabled={!note.trim()} onClick={() => void run("note", () => addCaseNote({ school: schoolId, caseId: a.caseId!, body: note }), "Note saved").then(() => setNote(""))}>
              Save note
            </Button>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {a.groupId ? (
              <Button size="sm" variant="ghost" loading={pending === "reopen"} onClick={() => void run("reopen", () => reopenAgreementForMediation(schoolId, a.caseId!), "Agreement reopened. The roommates were told.")}>
                <FileText aria-hidden /> Reopen their agreement
              </Button>
            ) : null}
            {(Object.keys(OUTCOME) as (keyof typeof OUTCOME)[]).map((outcome) => (
              <Button key={outcome} size="sm" variant={outcome === "resolved" ? "primary" : "secondary"} loading={pending === outcome} onClick={() => void run(outcome, () => closeCase({ school: schoolId, caseId: a.caseId!, outcome }), `Closed: ${OUTCOME[outcome].toLowerCase()}`)}>
                {OUTCOME[outcome]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
