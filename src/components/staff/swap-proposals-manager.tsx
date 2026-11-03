"use client";

import * as React from "react";
import { ArrowRight, Check, X, ArrowLeftRight, TrendingUp, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  staffApproveSwapProposal,
  staffDeclineSwapProposal,
} from "@/app/actions/room-swaps";

export interface SwapProposalItem {
  id: string;
  school_id: string;
  cycle: string[];
  scores: Record<
    string,
    {
      currentScore: number;
      newScore: number;
      delta: number;
      targetRoommateId?: string;
    }
  >;
  status: "staff_pending" | "staff_approved" | "student_accepted" | "declined" | "cancelled" | "completed";
  staff_notes: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface StudentSummary {
  id: string;
  firstName: string;
  lastInitial: string;
  building?: string;
}

interface SwapProposalsManagerProps {
  proposals: SwapProposalItem[];
  studentMap: Record<string, StudentSummary>;
}

export function SwapProposalsManager({
  proposals,
  studentMap,
}: SwapProposalsManagerProps) {
  const [filter, setFilter] = React.useState<"staff_pending" | "staff_approved" | "completed" | "all">("staff_pending");
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  const filtered = proposals.filter((p) => {
    if (filter === "all") return true;
    if (filter === "completed") return p.status === "completed" || p.status === "student_accepted";
    return p.status === filter;
  });

  async function handleApprove(id: string) {
    setSubmittingId(id);
    try {
      const res = await staffApproveSwapProposal(id);
      if (res.ok) {
        toast("Swap proposal approved", {
          description: "Students will be notified to review and accept the swap.",
        });
        window.location.reload();
      } else {
        toast("Could not approve swap", { description: res.error });
      }
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleDecline(id: string) {
    setSubmittingId(id);
    try {
      const res = await staffDeclineSwapProposal(id);
      if (res.ok) {
        toast("Proposal declined");
        window.location.reload();
      } else {
        toast("Could not decline swap", { description: res.error });
      }
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-md text-ink">Room Swap Marketplace</h1>
        <p className="mt-1 text-body-sm text-ink-2">
          Automated multi-party cycle finder. Approving allows students to review their new assignments and mutual scores.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "staff_pending", label: "Pending Review" },
            { id: "staff_approved", label: "Approved (Awaiting Students)" },
            { id: "completed", label: "Completed" },
            { id: "all", label: "All proposals" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors ${
              filter === t.id
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-hover"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-2">
            <ArrowLeftRight className="mx-auto size-8 text-ink-3" />
            <p className="mt-2 text-body font-semibold text-ink">No proposals in this view</p>
            <p className="mt-1 text-caption text-ink-3">
              When students in the room change pool can form mutually beneficial 2-way or 3-way cycles, they will appear here.
            </p>
          </div>
        ) : (
          filtered.map((prop) => {
            const isPending = prop.status === "staff_pending";
            const is2Way = prop.cycle.length === 2;

            // Calculate average delta
            const deltas = Object.values(prop.scores).map((s) => s.delta);
            const avgDelta =
              deltas.length > 0
                ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
                : 0;

            return (
              <div
                key={prop.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-xs"
              >
                {/* Proposal Top Bar */}
                <div className="flex items-center justify-between border-b border-line pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <ArrowLeftRight className="size-4" />
                    </span>
                    <span className="text-body-sm font-semibold text-ink">
                      {is2Way ? "2-Way Mutual Swap" : "3-Way Circular Swap"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-caption-xs font-semibold text-emerald-600">
                      <TrendingUp className="size-3" /> +{avgDelta} avg score boost
                    </span>
                    <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-caption-xs font-semibold text-ink-3 capitalize">
                      {prop.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Swap Cycle Moves */}
                <div className="mt-4 space-y-3">
                  {prop.cycle.map((uid, idx) => {
                    const student = studentMap[uid];
                    const nextUid = prop.cycle[(idx + 1) % prop.cycle.length];
                    const targetStudent = studentMap[nextUid];
                    const scoreData = prop.scores[uid];

                    return (
                      <div
                        key={uid}
                        className="flex flex-col gap-2 rounded-xl bg-surface-sunken p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-body text-ink">
                            {student ? `${student.firstName} ${student.lastInitial}.` : "Student"}
                          </span>
                          <ArrowRight className="size-3 text-ink-3" />
                          <span className="text-body-sm text-ink-2">
                            Swaps into {targetStudent ? `${targetStudent.firstName}'s spot` : "room"}
                          </span>
                        </div>

                        {scoreData ? (
                          <div className="flex items-center gap-2 text-caption">
                            <span className="text-ink-3">
                              Score: {scoreData.currentScore}% → {scoreData.newScore}%
                            </span>
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-700">
                              +{scoreData.delta} pts
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                {isPending ? (
                  <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDecline(prop.id)}
                      disabled={submittingId === prop.id}
                    >
                      <X className="mr-1.5 size-3.5" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(prop.id)}
                      disabled={submittingId === prop.id}
                      className="bg-accent text-white hover:opacity-90"
                    >
                      <Check className="mr-1.5 size-3.5" /> Approve & send to students
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
