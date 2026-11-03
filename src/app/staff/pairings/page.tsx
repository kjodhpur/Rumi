import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadPairings, type PairingStatus } from "@/lib/staff/dashboard";
import { logAudit } from "@/lib/staff/audit";
import { PairingsReview } from "@/components/staff/pairings-review";

export const metadata: Metadata = { title: "Pairings" };

const FILTERS = ["all", "unreviewed", "needs_review", "approved"] as const;

export default async function PairingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const context = await requireStaffPage("managePairings");
  const pairings = await loadPairings(context.school.id);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_pairings",
    entity: "pairing_list",
    meta: { count: pairings?.length ?? 0 },
  });
  const filter = (FILTERS as readonly string[]).includes(searchParams.status ?? "") ? (searchParams.status as "all" | PairingStatus) : "all";
  return <PairingsReview schoolId={context.school.id} pairings={pairings} filter={filter} />;
}
