"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronDown, Send, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { Select } from "@/components/ui/select";
import { decideProposals, runAutoPair, sendApprovedProposals } from "@/app/actions/staff-dashboard";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import type { AutoPairRun, ProposalRow } from "@/lib/staff/dashboard";
import { cn } from "@/lib/utils";

const MIN_SCORES = [50, 60, 70, 80];

const STATUS: Record<
  string,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "accent" | "outline" }
> = {
  proposed: { label: "Proposed", variant: "neutral" },
  approved: { label: "Approved", variant: "accent" },
  rejected: { label: "Rejected", variant: "outline" },
  sent: { label: "Waiting on students", variant: "warning" },
  accepted: { label: "Both said yes", variant: "success" },
  declined: { label: "Declined", variant: "outline" },
  invalid: { label: "No longer possible", variant: "outline" },
};

const REASON_COPY: Record<string, string> = {
  no_partner: "No compatible partner among the students waiting",
  below_min: "Only matches below the minimum score",
  odd_one_out: "Compatible, but their best options were paired with others",
};

export function AutoPair({
  schoolId,
  office,
  run,
}: {
  schoolId: string;
  office: string | null;
  run: AutoPairRun | null;
}) {
  const router = useRouter();
  const [minScore, setMinScore] = React.useState(run?.params.minScore ?? 60);
  const [running, setRunning] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState<string | null>(null);
  const proposals = run?.proposals ?? [];
  const decidable = proposals.filter((p) =>
    ["proposed", "approved", "rejected"].includes(p.status),
  );
  const approvedCount = proposals.filter((p) => p.status === "approved").length;

  async function startRun() {
    setRunning(true);
    const result = await runAutoPair({ schoolId, minScore });
    setRunning(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(
      result.data.pairs ? `${result.data.pairs} pairs proposed` : "No pairs met the minimum score",
    );
    setSelected(new Set());
    router.refresh();
  }

  async function decide(ids: string[], decision: "approved" | "rejected" | "proposed") {
    setBusy(decision);
    const result = await decideProposals({ schoolId, proposalIds: ids, decision });
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    setSelected(new Set());
    router.refresh();
  }

  async function send() {
    setBusy("send");
    const result = await sendApprovedProposals({ schoolId });
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(
      `${result.data.sent} ${result.data.sent === 1 ? "suggestion" : "suggestions"} sent`,
      {
        description: "Each student is notified. A pair only forms if both say yes.",
      },
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/staff/pairings"
          className="inline-flex items-center gap-1.5 rounded-sm text-body-sm text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden /> Pairings
        </Link>
      </div>
      <PageHeader
        title="Auto-pair"
        description="Propose roommates for sharing students who haven't found one. You review every pair, and students only pair up if both say yes."
        className="pb-0 lg:pb-0"
      />

      <section
        aria-labelledby="run-title"
        className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <h2 id="run-title" className="text-body font-semibold text-ink">
            New run
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            Pairs as many students as possible, then picks the highest total compatibility. Pairs
            that break a dealbreaker are never proposed. A new run replaces unsent proposals.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-ink-2">Minimum score</span>
          <Select
            value={String(minScore)}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-44"
          >
            {MIN_SCORES.map((s) => (
              <option key={s} value={s}>
                {s} or higher
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={() => void startRun()} loading={running}>
          <Sparkles aria-hidden /> Run auto-pair
        </Button>
      </section>

      {!run ? (
        <EmptyState
          icon={<Sparkles strokeWidth={1.75} />}
          title="No runs yet"
          description={
            office
              ? "Run auto-pair to see proposed pairs for students still looking."
              : "Auto-pair only includes students who chose to share their results, which becomes possible once your pilot agreement is signed."
          }
        />
      ) : (
        <>
          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="sr-only">
              Run summary
            </h2>
            <p className="mb-3 text-caption text-ink-3">
              Run <RelativeTime iso={run.createdAt} />
              {run.createdBy ? ` by ${run.createdBy}` : ""} · minimum score{" "}
              {run.params.minScore ?? "—"}
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Stat label="Students waiting" value={run.stats.candidates ?? 0} />
              <Stat label="With a compatible partner" value={run.stats.feasible ?? 0} />
              <Stat
                label="Paired"
                value={run.stats.paired ?? 0}
                note={
                  run.stats.feasible
                    ? `${Math.round(((run.stats.paired ?? 0) / run.stats.feasible) * 100)}% of compatible`
                    : undefined
                }
              />
              <Stat label="Average score" value={run.stats.averageScore ?? null} />
            </ul>
          </section>

          {proposals.length > 0 ? (
            <section aria-labelledby="proposals-title" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="proposals-title" className="text-title font-semibold text-ink">
                  Proposed pairs
                </h2>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    disabled={selected.size === 0}
                    loading={busy === "rejected"}
                    onClick={() => void decide([...selected], "rejected")}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={selected.size === 0}
                    loading={busy === "approved"}
                    onClick={() => void decide([...selected], "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={approvedCount === 0}
                    loading={busy === "send"}
                    onClick={() => void send()}
                  >
                    <Send aria-hidden /> Send {approvedCount || ""} to students
                  </Button>
                </div>
              </div>
              {decidable.length > 0 ? (
                <label className="flex items-center gap-2.5 text-body-sm text-ink">
                  <Checkbox
                    checked={
                      selected.size === decidable.length
                        ? true
                        : selected.size > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(v) =>
                      setSelected(v === true ? new Set(decidable.map((p) => p.id)) : new Set())
                    }
                    aria-label="Select all proposals still open"
                  />
                  {selected.size > 0 ? `${selected.size} selected` : "Select all open proposals"}
                </label>
              ) : null}
              <ul className="flex flex-col gap-2">
                {proposals.map((p) => (
                  <ProposalItem
                    key={p.id}
                    proposal={p}
                    selectable={["proposed", "approved", "rejected"].includes(p.status)}
                    selected={selected.has(p.id)}
                    onSelect={(on) =>
                      setSelected((s) => {
                        const next = new Set(s);
                        if (on) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                    onDecide={(d) => void decide([p.id], d)}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {run.stats.unpaired && run.stats.unpaired.length > 0 ? (
            <Unpaired rows={run.stats.unpaired} />
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 shadow-xs ring-1 ring-line sm:p-4">
      <span className="text-caption text-ink-3">{label}</span>
      <span className="text-title font-semibold text-ink sm:text-display-sm">
        {value === null ? "—" : value.toLocaleString("en-US")}
      </span>
      {note ? <span className="text-caption text-ink-3">{note}</span> : null}
    </li>
  );
}

function ProposalItem({
  proposal,
  selectable,
  selected,
  onSelect,
  onDecide,
}: {
  proposal: ProposalRow;
  selectable: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onDecide: (decision: "approved" | "rejected" | "proposed") => void;
}) {
  const status = STATUS[proposal.status] ?? STATUS.proposed;
  const names = proposal.members.map((m) => m.name).join(" & ");
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl bg-surface p-4 shadow-xs ring-1 ring-line sm:px-5",
        proposal.status === "rejected" && "opacity-60",
      )}
    >
      {selectable ? (
        <Checkbox
          className="mt-0.5"
          checked={selected}
          onCheckedChange={(v) => onSelect(v === true)}
          aria-label={`Select ${names}`}
        />
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-body-sm font-semibold text-ink">{names}</span>
          <Badge size="sm" variant={status.variant}>
            {status.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-caption text-ink-3">
          {proposal.members
            .map((m) => (m.classYear ? labelOf(CLASS_YEARS, m.classYear) : "Year not set"))
            .join(" · ")}
        </p>
        {proposal.reasons.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Why they match">
            {proposal.reasons.slice(0, 3).map((r) => (
              <li
                key={r}
                className="rounded-full bg-surface-sunken px-2.5 py-1 text-caption text-ink-2"
              >
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className="text-title font-semibold text-ink tabular-nums"
          aria-label={`Score ${proposal.score}`}
        >
          {proposal.score}
        </span>
        {selectable ? (
          <span className="flex gap-1">
            <Button
              variant={proposal.status === "rejected" ? "subtle" : "ghost"}
              size="icon-sm"
              aria-label={
                proposal.status === "rejected" ? `Undo reject for ${names}` : `Reject ${names}`
              }
              aria-pressed={proposal.status === "rejected"}
              onClick={() => onDecide(proposal.status === "rejected" ? "proposed" : "rejected")}
            >
              <X aria-hidden />
            </Button>
            <Button
              variant={proposal.status === "approved" ? "primary" : "secondary"}
              size="icon-sm"
              aria-label={
                proposal.status === "approved" ? `Undo approval for ${names}` : `Approve ${names}`
              }
              aria-pressed={proposal.status === "approved"}
              onClick={() => onDecide(proposal.status === "approved" ? "proposed" : "approved")}
            >
              <Check aria-hidden />
            </Button>
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Unpaired({
  rows,
}: {
  rows: { id: string; name: string; reason: string; detail?: string | null }[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <section
      aria-labelledby="unpaired-title"
      className="rounded-xl bg-surface shadow-xs ring-1 ring-line"
    >
      <h2 id="unpaired-title">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="text-body font-semibold text-ink">
            Not paired <span className="font-normal text-ink-3">({rows.length})</span>
          </span>
          <ChevronDown
            className={cn(
              "size-5 text-ink-3 transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </h2>
      {open ? (
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-body-sm font-medium text-ink">{r.name}</span>
              <span className="text-caption text-ink-3 sm:text-right">
                {REASON_COPY[r.reason] ?? r.reason}
                {r.detail ? <span className="block text-ink-2">{r.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
