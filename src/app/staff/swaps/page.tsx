import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SwapProposalsManager,
  type SwapProposalItem,
  type StudentSummary,
} from "@/components/staff/swap-proposals-manager";

export const metadata: Metadata = { title: "Room Swaps — Housing Staff" };
export const dynamic = "force-dynamic";

export default async function StaffSwapsPage() {
  const context = await requireStaffPage("managePairings");
  const supabase = createAdminClient();

  const { data: proposalsData } = await supabase
    .from("swap_proposals")
    .select("*")
    .eq("school_id", context.school.id)
    .order("created_at", { ascending: false });

  const proposals: SwapProposalItem[] = (proposalsData || []).map((p) => ({
    id: p.id,
    school_id: p.school_id,
    cycle: p.cycle,
    scores: (p.scores as SwapProposalItem["scores"]) || {},
    status: p.status as SwapProposalItem["status"],
    staff_notes: p.staff_notes,
    decided_at: p.decided_at,
    created_at: p.created_at,
  }));

  // Collect all user IDs across cycles
  const allUserIds = Array.from(new Set(proposals.flatMap((p) => p.cycle)));

  let studentMap: Record<string, StudentSummary> = {};
  if (allUserIds.length > 0) {
    const { data: students } = await supabase
      .from("profiles")
      .select("id, first_name, last_initial")
      .in("id", allUserIds);

    for (const s of students || []) {
      studentMap[s.id] = {
        id: s.id,
        firstName: s.first_name || "Student",
        lastInitial: s.last_initial || "",
      };
    }
  }

  return (
    <SwapProposalsManager
      proposals={proposals}
      studentMap={studentMap}
    />
  );
}
