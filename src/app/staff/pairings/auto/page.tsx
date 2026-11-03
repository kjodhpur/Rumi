import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadLatestRun } from "@/lib/staff/dashboard";
import { logAudit } from "@/lib/staff/audit";
import { AutoPair } from "@/components/staff/auto-pair";

export const metadata: Metadata = { title: "Auto-pair" };

export default async function AutoPairPage() {
  const context = await requireStaffPage("managePairings");
  const run = await loadLatestRun(context.school.id);
  if (run) {
    await logAudit({
      actorId: context.userId,
      schoolId: context.school.id,
      action: "viewed_auto_pair",
      entity: "auto_pair_run",
      entityId: run.id,
      meta: { count: run.proposals.length },
    });
  }
  return <AutoPair schoolId={context.school.id} office={context.school.housingOfficeName} run={run} />;
}
