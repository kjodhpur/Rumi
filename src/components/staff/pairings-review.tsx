"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CircleCheck, EyeOff, FileSignature, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { savePairingNote, setPairingStatus } from "@/app/actions/staff-dashboard";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import type { Pairing, PairingStatus } from "@/lib/staff/dashboard";
import { cn } from "@/lib/utils";

const FILTERS: { value: "all" | PairingStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unreviewed", label: "To review" },
  { value: "needs_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
];

const STATUS_BADGE: Record<PairingStatus, { label: string; variant: "neutral" | "warning" | "success" }> = {
  unreviewed: { label: "To review", variant: "neutral" },
  needs_review: { label: "Needs review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
};

export function PairingsReview({
  schoolId,
  pairings,
  filter,
}: {
  schoolId: string;
  pairings: Pairing[] | null;
  filter: "all" | PairingStatus;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<Pairing | null>(null);
  const [pending, setPending] = React.useState<PairingStatus | null>(null);
  const all = pairings ?? [];
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, f.value === "all" ? all.length : all.filter((p) => p.status === f.value).length]));

  async function apply(status: PairingStatus, groupIds: string[]) {
    setPending(status);
    const result = await setPairingStatus({ schoolId, groupIds, status });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(
      status === "approved"
        ? `${result.data.updated} approved for assignment`
        : status === "needs_review"
          ? `${result.data.updated} marked for review`
          : `${result.data.updated} moved back to review`,
    );
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pairings"
        description="Pairs and groups students formed on Rumi. Approve the ones ready for assignment."
        className="pb-0 lg:pb-0"
        actions={
          <Button asChild variant="secondary">
            <Link href="/staff/pairings/auto">
              <Sparkles aria-hidden /> Auto-pair
            </Link>
          </Button>
        }
      />

      <nav aria-label="Filter pairings" className="-mb-2 flex gap-1 overflow-x-auto border-b border-line">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/staff/pairings" : `/staff/pairings?status=${f.value}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-body-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {f.label}
              <span className="text-caption text-ink-3 tabular-nums">{counts[f.value]}</span>
            </Link>
          );
        })}
      </nav>

      {pairings === null ? (
        <ErrorState title="Couldn't load pairings" description="Refresh the page to try again." />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Users strokeWidth={1.75} />}
          title={all.length === 0 ? "No pairs yet" : "Nothing here"}
          description={
            all.length === 0
              ? "Pairs and groups appear once sharing students team up, or accept a suggestion from auto-pair."
              : "No pairings match this filter."
          }
          action={
            all.length === 0 ? (
              <Button asChild>
                <Link href="/staff/pairings/auto">Run auto-pair</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2.5 text-body-sm text-ink">
              <Checkbox
                checked={selected.size === shown.length ? true : selected.size > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => setSelected(v === true ? new Set(shown.map((p) => p.groupId)) : new Set())}
                aria-label="Select all pairings"
              />
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </label>
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                disabled={selected.size === 0}
                loading={pending === "needs_review"}
                onClick={() => void apply("needs_review", [...selected])}
              >
                Needs review
              </Button>
              <Button disabled={selected.size === 0} loading={pending === "approved"} onClick={() => void apply("approved", [...selected])}>
                Approve
              </Button>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.groupId} className="flex items-start gap-3 rounded-xl bg-surface p-4 shadow-xs ring-1 ring-line sm:items-center sm:px-5">
                <Checkbox
                  className="mt-0.5 sm:mt-0"
                  checked={selected.has(p.groupId)}
                  onCheckedChange={(v) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (v === true) next.add(p.groupId);
                      else next.delete(p.groupId);
                      return next;
                    })
                  }
                  aria-label={`Select ${p.name}`}
                />
                <button
                  type="button"
                  onClick={() => setOpen(p)}
                  className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-semibold text-ink">{p.members.map((m) => m.name).join(", ")}</span>
                    <span className="mt-0.5 block text-caption text-ink-3">
                      {p.members.length === p.targetSize ? `${p.members.length} people` : `${p.members.length} of ${p.targetSize} people`}
                      {p.membersChanged ? " · members changed since approval" : ""}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_BADGE[p.status].variant}>
                        {p.status === "approved" ? <CircleCheck aria-hidden /> : null}
                        {STATUS_BADGE[p.status].label}
                      </Badge>
                      {p.dealbreaker ? (
                        <Badge variant="danger">
                          <AlertTriangle aria-hidden /> Dealbreaker
                        </Badge>
                      ) : null}
                      {p.agreement === "signed" ? (
                        <Badge variant="outline">
                          <FileSignature aria-hidden /> Agreement signed
                        </Badge>
                      ) : p.agreement === "draft" || p.agreement === "reopened" ? (
                        <Badge variant="outline">
                          <FileSignature aria-hidden /> Agreement in progress
                        </Badge>
                      ) : null}
                      {p.members.some((m) => m.hidden) ? (
                        <Badge variant="outline">
                          <EyeOff aria-hidden /> Profile hidden
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-title font-semibold text-ink tabular-nums">{p.combinedScore ?? "—"}</span>
                    <span className="text-caption text-ink-3">{p.combinedScore === null ? "no score" : "combined"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <PairingSheet pairing={open} schoolId={schoolId} onClose={() => setOpen(null)} onApply={apply} pending={pending} />
    </div>
  );
}

function PairingSheet({
  pairing,
  schoolId,
  onClose,
  onApply,
  pending,
}: {
  pairing: Pairing | null;
  schoolId: string;
  onClose: () => void;
  onApply: (status: PairingStatus, groupIds: string[]) => Promise<void>;
  pending: PairingStatus | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setNotes(pairing?.notes ?? ""), [pairing]);
  if (!pairing) return <Sheet open={false} onOpenChange={() => onClose()} title="Pairing">{null}</Sheet>;
  const nameOf = new Map(pairing.members.map((m) => [m.id, m.name]));

  async function saveNotes() {
    if (!pairing) return;
    setSaving(true);
    const result = await savePairingNote({ schoolId, groupId: pairing.groupId, notes });
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Note saved");
    router.refresh();
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={pairing.name}
      description={`Formed ${new Date(pairing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · combined score ${pairing.combinedScore ?? "—"}`}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            loading={pending === "needs_review"}
            onClick={() => void onApply("needs_review", [pairing.groupId]).then(onClose)}
          >
            Needs review
          </Button>
          <Button className="flex-1" loading={pending === "approved"} onClick={() => void onApply("approved", [pairing.groupId]).then(onClose)}>
            Approve for assignment
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section aria-labelledby="members-h">
          <h3 id="members-h" className="text-body-sm font-semibold text-ink">
            Members
          </h3>
          <ul className="mt-2 divide-y divide-line rounded-lg ring-1 ring-line">
            {pairing.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3.5 py-2.5 text-body-sm">
                <span className={cn("flex-1", m.shared ? "text-ink" : "text-ink-3 italic")}>{m.name}</span>
                <span className="text-caption text-ink-3">{m.classYear ? labelOf(CLASS_YEARS, m.classYear) : ""}</span>
                {m.hidden ? <Badge size="sm" variant="outline">Hidden</Badge> : null}
              </li>
            ))}
          </ul>
          {pairing.members.some((m) => !m.shared) ? (
            <p className="mt-2 text-caption text-ink-3">Members who haven&apos;t chosen to share appear without names or scores.</p>
          ) : null}
        </section>

        <section aria-labelledby="pairs-h">
          <h3 id="pairs-h" className="text-body-sm font-semibold text-ink">
            Pairwise fit
          </h3>
          <table className="mt-2 w-full text-left text-body-sm">
            <caption className="sr-only">Mutual score for each pair in the group</caption>
            <tbody className="divide-y divide-line">
              {pairing.pairScores.map((pair) => {
                const visible = pairing.members.find((m) => m.id === pair.a)?.shared && pairing.members.find((m) => m.id === pair.b)?.shared;
                return (
                  <tr key={`${pair.a}-${pair.b}`}>
                    <th scope="row" className="py-2 font-normal text-ink-2">
                      {nameOf.get(pair.a)} &amp; {nameOf.get(pair.b)}
                    </th>
                    <td className="py-2 text-right tabular-nums">
                      {pair.score === null ? (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <AlertTriangle className="size-4" aria-hidden /> Fails a dealbreaker
                        </span>
                      ) : visible ? (
                        <span className="font-semibold text-ink">{pair.score}</span>
                      ) : (
                        <span className="text-ink-3">Not shared</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="notes-h" className="flex flex-col gap-2">
          <h3 id="notes-h" className="text-body-sm font-semibold text-ink">
            Staff notes
          </h3>
          <Textarea
            aria-labelledby="notes-h"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Visible to housing staff only."
          />
          <div>
            <Button variant="secondary" size="sm" loading={saving} disabled={notes === (pairing.notes ?? "")} onClick={() => void saveNotes()}>
              Save note
            </Button>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
