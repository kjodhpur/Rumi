"use client";

import * as React from "react";
import { CheckCircle2, RotateCcw, AlertTriangle, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveRaAlert } from "@/app/actions/ra-workspace";

export interface RaAlertRow {
  user_id: string;
  first_name: string;
  building: string;
  room: string | null;
  score: number;
  level: "low" | "medium" | "high";
  ask_ra: boolean;
  reasons: string[];
  note: string | null;
  submitted_at: string;
}

interface RaWorkspaceViewProps {
  schoolId: string;
  rows: RaAlertRow[];
}

export function RaWorkspaceView({ schoolId, rows }: RaWorkspaceViewProps) {
  const [filterBuilding, setFilterBuilding] = React.useState<string>("all");
  const [resolvedIds, setResolvedIds] = React.useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const buildings = Array.from(new Set(rows.map((r) => r.building))).filter(Boolean);

  const filtered = rows.filter((r) => {
    if (resolvedIds.has(r.user_id)) return false;
    if (filterBuilding !== "all" && r.building !== filterBuilding) return false;
    return true;
  });

  async function handleResolve(userId: string, outcome: "resolved" | "room_change" | "escalated") {
    setLoadingId(userId);
    const res = await resolveRaAlert(schoolId, userId, outcome);
    setLoadingId(null);

    if (res.ok) {
      setResolvedIds((prev) => new Set([...prev, userId]));
      toast.success(
        outcome === "resolved"
          ? "Alert resolved"
          : outcome === "room_change"
            ? "Escalated to smart room-swap pool"
            : "Escalated to Housing Office & CARE team",
      );
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-4">
      {buildings.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterBuilding("all")}
            className={`rounded-full px-3 py-1 text-caption font-medium transition-colors ${
              filterBuilding === "all"
                ? "bg-ink text-ink-inverse"
                : "border border-line bg-surface text-ink hover:bg-surface-sunken"
            }`}
          >
            All buildings ({rows.length})
          </button>
          {buildings.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setFilterBuilding(b)}
              className={`rounded-full px-3 py-1 text-caption font-medium transition-colors ${
                filterBuilding === b
                  ? "bg-ink text-ink-inverse"
                  : "border border-line bg-surface text-ink hover:bg-surface-sunken"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-body-sm text-ink-2 ring-1 ring-line">
          {resolvedIds.size > 0
            ? "All active alerts in your scope have been resolved."
            : "No shared alerts in your buildings."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((row) => (
            <li
              key={`${row.user_id}-${row.submitted_at}`}
              className="rounded-xl bg-surface p-5 ring-1 ring-line shadow-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-body font-semibold text-ink">{row.first_name}</h2>
                  {row.ask_ra ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-caption-xs font-semibold text-accent">
                      <AlertTriangle className="size-3" />
                      <span>Asked for help</span>
                    </span>
                  ) : null}
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-caption-xs font-bold uppercase tracking-wider ${
                    row.level === "high"
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-sunken text-ink-2"
                  }`}
                >
                  {row.level} risk
                </span>
              </div>

              <p className="mt-1 text-body-sm text-ink-2">
                {row.building}
                {row.room ? ` · Room ${row.room}` : ""} · Check-in score: {row.score}/5
              </p>

              {row.reasons?.length ? (
                <ul className="mt-2 list-disc pl-5 text-body-sm text-ink-2">
                  {row.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}

              {row.note ? (
                <div className="mt-3 rounded-lg border border-line bg-surface-sunken p-3 text-body-sm text-ink">
                  <p className="text-caption-xs font-semibold uppercase tracking-wider text-ink-3">
                    Student Note
                  </p>
                  <p className="mt-0.5 italic">&ldquo;{row.note}&rdquo;</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingId === row.user_id}
                  onClick={() => handleResolve(row.user_id, "resolved")}
                  className="inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="size-3.5 text-accent" />
                  <span>Mark resolved</span>
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingId === row.user_id}
                  onClick={() => handleResolve(row.user_id, "room_change")}
                  className="inline-flex items-center gap-1.5 text-ink-2"
                >
                  <ArrowRightLeft className="size-3.5" />
                  <span>Propose room swap</span>
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingId === row.user_id}
                  onClick={() => handleResolve(row.user_id, "escalated")}
                  className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700"
                >
                  <ShieldAlert className="size-3.5" />
                  <span>Escalate to Housing</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
