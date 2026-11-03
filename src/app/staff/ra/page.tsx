import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { RaWorkspaceView, type RaAlertRow } from "@/components/staff/ra-workspace-view";

export const metadata: Metadata = { title: "RA workspace" };

export default async function RaPage() {
  const context = await requireStaffPage("raWorkspace");
  const { data, error } = await createClient().rpc("ra_risk_list", { p_school: context.school.id });
  const rows: RaAlertRow[] = error ? [] : ((data ?? []) as RaAlertRow[]);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_ra_risk_list",
    entity: "checkin_list",
    meta: { count: rows.length },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check-ins"
        description="Medium and high risk, and only students who shared the check-in or asked for help. Private notes stay hidden unless they shared them."
      />
      <RaWorkspaceView schoolId={context.school.id} rows={rows} />
    </div>
  );
}
