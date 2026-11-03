"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, ArrowRight, Check, Download, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { completeSwap, decideSwapProposal, runSwapFinder } from "@/app/actions/room-swaps";

export type SwapStatus = "staff_pending" | "staff_approved" | "student_accepted" | "declined" | "cancelled" | "completed";

export interface SwapProposalView {
  id: string;
  status: SwapStatus;
  createdAt: string;
  averageDelta: number;
  moves: { userId: string; name: string; from: string; to: string; currentScore: number; newScore: number; accepted: boolean | null }[];
  stayers: { name: string; currentScore: number; newScore: number }[];
}

const STATUS: Record<SwapStatus, { label: string; variant: "neutral" | "accent" | "success" | "warning" | "danger" }> = {
  staff_pending: { label: "Needs review", variant: "warning" },
  staff_approved: { label: "Waiting on students", variant: "accent" },
  student_accepted: { label: "Accepted · move in housing system", variant: "success" },
  completed: { label: "Done", variant: "neutral" },
  declined: { label: "Declined", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

type Filter = "review" | "live" | "closed";

export function SwapProposalsManager({ schoolId, poolSize, proposals }: { schoolId: string; poolSize: number; proposals: SwapProposalView[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>("review");
  const [pending, setPending] = React.useState<string | null>(null);

  const shown = proposals.filter((p) =>
    filter === "review" ? p.status === "staff_pending" : filter === "live" ? p.status === "staff_approved" || p.status === "student_accepted" : ["completed", "declined", "cancelled"].includes(p.status),
  );

  async function act(key: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setPending(key);
    const result = await fn();
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(success);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Room swaps"
        description={`${poolSize} ${poolSize === 1 ? "student is" : "students are"} looking for a swap. Rumi only proposes swaps where every mover's match improves by 10+ and nobody staying behind gets a worse match. You carry out moves in your housing system.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <a href="/api/staff/swaps/export">
                <Download aria-hidden /> Accepted swaps CSV
              </a>
            </Button>
            <Button loading={pending === "run"} onClick={() => void act("run", async () => {
              const r = await runSwapFinder(schoolId);
              return r.ok ? { ok: true as const } : r;
            }, "Swap finder ran")}>
              <RefreshCw aria-hidden /> Find swaps
            </Button>
          </div>
        }
        className="pb-0 lg:pb-0"
      />

      <SegmentedControl
        aria-label="Show"
        className="max-w-[420px]"
        value={filter}
        onValueChange={setFilter}
        options={[
          { value: "review", label: `To review (${proposals.filter((p) => p.status === "staff_pending").length})` },
          { value: "live", label: "In progress" },
          { value: "closed", label: "Closed" },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight strokeWidth={1.75} />}
          title={filter === "review" ? "No swaps to review" : filter === "live" ? "Nothing in progress" : "No closed swaps yet"}
          description={poolSize < 2 ? "Swaps need at least two students in the pool with a known roommate." : "Run the swap finder to look for new swaps."}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((p) => (
            <li key={p.id} className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS[p.status].variant}>{STATUS[p.status].label}</Badge>
                  <span className="text-caption text-ink-3">{p.moves.length}-way · average +{p.averageDelta}</span>
                </div>
                <span className="text-caption text-ink-3">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <table className="mt-4 w-full text-left text-body-sm">
                <caption className="sr-only">Moves in this swap</caption>
                <thead className="text-caption text-ink-3">
                  <tr>
                    <th scope="col" className="pb-2 font-medium">Student</th>
                    <th scope="col" className="pb-2 font-medium">Move</th>
                    <th scope="col" className="pb-2 text-right font-medium">Match</th>
                    <th scope="col" className="pb-2 text-right font-medium"><span className="sr-only">Answer</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {p.moves.map((m) => (
                    <tr key={m.userId}>
                      <td className="py-2 font-medium text-ink">{m.name}</td>
                      <td className="py-2 text-ink-2">
                        {m.from} <ArrowRight className="inline size-3.5" aria-label="to" /> {m.to}
                      </td>
                      <td className="py-2 text-right text-ink tabular-nums">
                        {m.currentScore} → <span className="font-semibold">{m.newScore}</span>
                      </td>
                      <td className="py-2 pl-3 text-right text-caption">
                        {m.accepted === true ? <span className="text-success">Accepted</span> : m.accepted === false ? <span className="text-danger">Declined</span> : p.status === "staff_approved" ? <span className="text-ink-3">Waiting</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {p.stayers.length ? (
                <p className="mt-3 text-caption text-ink-3">
                  Staying: {p.stayers.map((s) => `${s.name} ${s.currentScore} → ${s.newScore}`).join(" · ")}
                </p>
              ) : null}
              {p.status === "staff_pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" loading={pending === `a-${p.id}`} onClick={() => void act(`a-${p.id}`, () => decideSwapProposal({ schoolId, proposalId: p.id, approve: true }), "Sent to the students")}>
                    <Check aria-hidden /> Approve and send
                  </Button>
                  <Button size="sm" variant="secondary" loading={pending === `d-${p.id}`} onClick={() => void act(`d-${p.id}`, () => decideSwapProposal({ schoolId, proposalId: p.id, approve: false }), "Declined")}>
                    <X aria-hidden /> Decline
                  </Button>
                </div>
              ) : p.status === "student_accepted" ? (
                <Button size="sm" className="mt-4" loading={pending === `c-${p.id}`} onClick={() => void act(`c-${p.id}`, () => completeSwap(schoolId, p.id), "Marked as moved")}>
                  <Check aria-hidden /> Mark as moved
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
