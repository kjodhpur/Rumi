import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { SwapProposalsManager, type SwapProposalView, type SwapStatus } from "@/components/staff/swap-proposals-manager";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = { title: "Room swaps" };
export const dynamic = "force-dynamic";

interface StoredScores {
  moves?: Record<string, { toRoomOf: string; newRoommateId: string; currentScore: number; newScore: number }>;
  stayers?: Record<string, { currentScore: number; newScore: number }>;
  averageDelta?: number;
}

/**
 * Students in the swap pool asked for a room change and opted into staff-reviewed swaps,
 * which is what lets staff see their name and room here. Every view is audited.
 */
export default async function StaffSwapsPage() {
  const context = await requireStaffPage("managePairings");
  const db = createAdminClient();
  const [{ data: rows, error }, { count: poolSize }] = await Promise.all([
    db.from("swap_proposals").select("id, cycle, assignment_ids, scores, responses, status, created_at").eq("school_id", context.school.id).order("created_at", { ascending: false }).limit(200),
    db.from("swap_pool").select("user_id", { count: "exact", head: true }).eq("school_id", context.school.id),
  ]);
  if (error) return <ErrorState title="Couldn't load swaps" description="Refresh the page to try again." />;

  const ids = [...new Set((rows ?? []).flatMap((r) => [...r.cycle, ...Object.keys(((r.scores as StoredScores | null)?.stayers ?? {}))]))];
  const assignmentIds = [...new Set((rows ?? []).flatMap((r) => r.assignment_ids))];
  const [{ data: people }, { data: rooms }] = await Promise.all([
    ids.length ? db.from("profiles").select("id, first_name, last_initial").in("id", ids) : Promise.resolve({ data: [] as { id: string; first_name: string; last_initial: string }[] }),
    assignmentIds.length ? db.from("assignments").select("id, user_id, building, room").in("id", assignmentIds) : Promise.resolve({ data: [] as { id: string; user_id: string; building: string; room: string | null }[] }),
  ]);
  const name = (id: string) => {
    const p = (people ?? []).find((x) => x.id === id);
    return p ? `${p.first_name}${p.last_initial ? ` ${p.last_initial}.` : ""}` : "Former student";
  };
  const roomOf = (userId: string) => {
    const a = (rooms ?? []).find((r) => r.user_id === userId);
    return a ? `${a.building}${a.room ? ` ${a.room}` : ""}` : "Unknown room";
  };

  const proposals: SwapProposalView[] = (rows ?? []).map((r) => {
    const scores = (r.scores ?? {}) as StoredScores;
    const responses = (r.responses ?? {}) as Record<string, boolean>;
    return {
      id: r.id,
      status: r.status as SwapStatus,
      createdAt: r.created_at,
      averageDelta: scores.averageDelta ?? 0,
      moves: r.cycle.map((id) => {
        const m = scores.moves?.[id];
        return {
          userId: id,
          name: name(id),
          from: roomOf(id),
          to: m ? roomOf(m.toRoomOf) : "—",
          currentScore: m?.currentScore ?? 0,
          newScore: m?.newScore ?? 0,
          accepted: id in responses ? responses[id]! : null,
        };
      }),
      stayers: Object.entries(scores.stayers ?? {}).map(([id, s]) => ({ name: name(id), ...s })),
    };
  });

  await logAudit({ actorId: context.userId, schoolId: context.school.id, action: "viewed_swap_proposals", entity: "swap_proposals", meta: { count: proposals.length } });
  return <SwapProposalsManager schoolId={context.school.id} poolSize={poolSize ?? 0} proposals={proposals} />;
}
