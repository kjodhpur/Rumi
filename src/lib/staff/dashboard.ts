import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Overview } from "./metrics";
import type { Term } from "./terms";

export { DEADLINE_LABELS, nextDeadline, type Term } from "./terms";

function toTerm(row: { id: string; name: string; starts_on: string; ends_on: string; deadlines: unknown }): Term {
  const d = (row.deadlines ?? {}) as Record<string, unknown>;
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    deadlines: {
      roommateRequest: date(d.roommateRequest),
      selectionOpens: date(d.selectionOpens),
      selectionCloses: date(d.selectionCloses),
    },
  };
}

export async function loadActiveTerm(schoolId: string): Promise<Term | null> {
  const { data } = await createClient()
    .from("terms")
    .select("id, name, starts_on, ends_on, deadlines")
    .eq("school_id", schoolId)
    .eq("active", true)
    .maybeSingle();
  return data ? toTerm(data) : null;
}

/** Role is enforced inside the SQL function (has_role), so this runs as the signed-in staff member. */
export async function loadOverview(schoolId: string, weeks: number): Promise<Overview | null> {
  const { data, error } = await createClient().rpc("staff_overview", { p_school: schoolId, p_weeks: weeks });
  if (error) {
    console.error("[staff] overview failed", error);
    return null;
  }
  return data as unknown as Overview;
}

export interface UnmatchedStudent {
  id: string;
  name: string;
  classYear: string | null;
  housingType: string | null;
  moveInDate: string | null;
  bestScore: number | null;
  strongMatches: number;
  onboardedAt: string | null;
  lastNudgedAt: string | null;
}

export async function loadUnmatched(schoolId: string): Promise<UnmatchedStudent[] | null> {
  const { data, error } = await createClient().rpc("staff_unmatched", { p_school: schoolId });
  if (error) {
    console.error("[staff] unmatched failed", error);
    return null;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: `${r.first_name}${r.last_initial ? ` ${r.last_initial}.` : ""}`,
    classYear: r.class_year,
    housingType: r.housing_type,
    moveInDate: r.move_in_date,
    bestScore: r.best_score,
    strongMatches: r.strong_matches,
    onboardedAt: r.onboarded_at,
    lastNudgedAt: r.last_nudged_at,
  }));
}

export type PairingStatus = "unreviewed" | "approved" | "needs_review";

export interface PairingMember {
  id: string;
  shared: boolean;
  name: string;
  classYear: string | null;
  hidden: boolean;
}

export interface Pairing {
  groupId: string;
  name: string;
  targetSize: number;
  createdAt: string;
  members: PairingMember[];
  pairScores: { a: string; b: string; score: number | null }[];
  status: PairingStatus;
  /** Approved, but the members have changed since. */
  membersChanged: boolean;
  notes: string | null;
  approvedAt: string | null;
  combinedScore: number | null;
  /** Some pair in the group fails a hard filter (dealbreaker). */
  dealbreaker: boolean;
  /** Roommate agreement status only; staff never see its text. */
  agreement: "draft" | "signed" | "reopened" | "void" | null;
}

export async function loadPairings(schoolId: string): Promise<Pairing[] | null> {
  const { data, error } = await createClient().rpc("staff_pairings", { p_school: schoolId });
  if (error) {
    console.error("[staff] pairings failed", error);
    return null;
  }
  return (data ?? []).map((r) => {
    const members = ((r.members ?? []) as {
      id: string;
      shared: boolean;
      firstName: string | null;
      lastInitial: string | null;
      classYear: string | null;
      hidden: boolean;
    }[]).map((m) => ({
      id: m.id,
      shared: m.shared,
      name: m.shared && m.firstName ? `${m.firstName}${m.lastInitial ? ` ${m.lastInitial}.` : ""}` : "Student (not shared)",
      classYear: m.shared ? m.classYear : null,
      hidden: m.hidden,
    }));
    const pairScores = (r.pair_scores ?? []) as { a: string; b: string; score: number | null }[];
    const scored = pairScores.filter((p) => p.score !== null).map((p) => p.score!);
    const current = members.map((m) => m.id).sort().join(",");
    const snapshot = (r.snapshot ?? []).slice().sort().join(",");
    const membersChanged = r.status === "approved" && snapshot !== current;
    return {
      groupId: r.group_id,
      name: r.name,
      targetSize: r.target_size,
      createdAt: r.created_at,
      members,
      pairScores,
      status: membersChanged ? "needs_review" : (r.status as PairingStatus),
      membersChanged,
      notes: r.staff_notes,
      approvedAt: r.approved_at,
      combinedScore: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
      dealbreaker: pairScores.some((p) => p.score === null),
      agreement: (r.agreement_status as Pairing["agreement"]) ?? null,
    };
  });
}

export interface ProposalRow {
  id: string;
  members: { id: string; name: string; classYear: string | null }[];
  score: number;
  reasons: string[];
  status: string;
  responses: Record<string, boolean>;
}

export interface AutoPairRun {
  id: string;
  createdAt: string;
  createdBy: string | null;
  params: { minScore?: number };
  stats: { candidates?: number; feasible?: number; paired?: number; averageScore?: number | null; unpaired?: { id: string; name: string; reason: string }[] };
  proposals: ProposalRow[];
}

export async function loadLatestRun(schoolId: string): Promise<AutoPairRun | null> {
  const db = createAdminClient();
  const { data: run } = await db
    .from("auto_pair_runs")
    .select("id, created_at, params, stats, profiles!auto_pair_runs_created_by_fkey(first_name)")
    .eq("school_id", schoolId)
    .is("superseded_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return null;
  const { data: proposals } = await db
    .from("auto_pair_proposals")
    .select("id, member_ids, score, reasons, status, responses")
    .eq("run_id", run.id)
    .order("score", { ascending: false });
  const ids = [...new Set((proposals ?? []).flatMap((p) => p.member_ids))];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, first_name, last_initial, class_year").in("id", ids)
    : { data: [] as { id: string; first_name: string; last_initial: string; class_year: string | null }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return {
    id: run.id,
    createdAt: run.created_at,
    createdBy: (run.profiles as { first_name: string } | null)?.first_name ?? null,
    params: (run.params ?? {}) as AutoPairRun["params"],
    stats: (run.stats ?? {}) as AutoPairRun["stats"],
    proposals: (proposals ?? []).map((p) => ({
      id: p.id,
      members: p.member_ids.map((id) => {
        const person = byId.get(id);
        return {
          id,
          name: person ? `${person.first_name}${person.last_initial ? ` ${person.last_initial}.` : ""}` : "Former student",
          classYear: person?.class_year ?? null,
        };
      }),
      score: p.score,
      reasons: Array.isArray(p.reasons) ? (p.reasons as { label?: string; text?: string }[]).map((r) => r.text ?? r.label ?? "").filter(Boolean) : [],
      status: p.status,
      responses: (p.responses ?? {}) as Record<string, boolean>,
    })),
  };
}
