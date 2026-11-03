import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import {
  loadHiddenMedia,
  loadStaffEscalationRoutes,
  loadStaffEscalations,
  loadStaffSafetyLog,
  loadStaffSchoolReports,
  safetyStats,
} from "@/lib/staff/safety";
import { SafetyCenter } from "@/components/staff/safety-center";

export const metadata: Metadata = { title: "Safety & reports" };
export const dynamic = "force-dynamic";

export default async function StaffSafetyPage() {
  const context = await requireStaffPage("moderate");

  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "safety_center_viewed",
    entity: "report",
  });

  const [reports, routes, log, hiddenMedia] = await Promise.all([
    loadStaffSchoolReports(context.school.id),
    loadStaffEscalationRoutes(context.school.id),
    loadStaffSafetyLog(context.school.id),
    loadHiddenMedia(context.school.id),
  ]);
  const escalations = await loadStaffEscalations(context.school.id, reports.map((r) => r.id));
  const stats = safetyStats(reports, routes, escalations);

  return (
    <SafetyCenter
      schoolId={context.school.id}
      schoolName={context.school.name}
      stats={stats}
      initialReports={reports}
      initialEscalations={escalations}
      routes={routes}
      log={log}
      hiddenMedia={hiddenMedia}
    />
  );
}
