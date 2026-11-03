import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RiskLevel } from "@/lib/retention/risk";

export interface CheckinHome {
  assignment: { id: string; building: string; room: string | null; movedInAt: string } | null;
  next: { dueOn: string } | null;
  history: { score: number; tags: string[]; submittedAt: string }[];
  risk: { level: RiskLevel; reasons: string[] } | null;
}

export async function loadCheckinHome(userId: string): Promise<CheckinHome> {
  const supabase = createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, building, room, moved_in_at")
    .eq("user_id", userId)
    .is("closed_at", null)
    .maybeSingle();
  if (!assignment) return { assignment: null, next: null, history: [], risk: null };

  const [{ data: checkins }, { data: risk }] = await Promise.all([
    supabase.from("checkins").select("due_on, score, tags, submitted_at").eq("assignment_id", assignment.id).order("due_on"),
    supabase.from("risk_events").select("level, reasons").eq("assignment_id", assignment.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const rows = checkins ?? [];
  const next = rows.find((row) => !row.submitted_at);
  return {
    assignment: { id: assignment.id, building: assignment.building, room: assignment.room, movedInAt: assignment.moved_in_at },
    next: next ? { dueOn: next.due_on } : null,
    history: rows
      .filter((row) => row.submitted_at && row.score !== null)
      .map((row) => ({ score: row.score!, tags: row.tags, submittedAt: row.submitted_at! })),
    risk: risk ? { level: risk.level as RiskLevel, reasons: risk.reasons } : null,
  };
}
