import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import {
  loadStaffEscalationRoutes,
  loadStaffEscalations,
  loadStaffSafetyLog,
  loadStaffSafetyStats,
  loadStaffSchoolReports,
} from "@/lib/staff/safety";
import { SafetyCenter } from "@/components/staff/safety-center";

export default async function StaffSafetyPage() {
  const context = await requireStaffPage("moderate");

  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "safety_center_viewed",
    entity: "report",
  });

  const [stats, reports, escalations, routes, log] = await Promise.all([
    loadStaffSafetyStats(context.school.id),
    loadStaffSchoolReports(context.school.id),
    loadStaffEscalations(context.school.id),
    loadStaffEscalationRoutes(context.school.id),
    loadStaffSafetyLog(context.school.id),
  ]);

  return (
    <SafetyCenter
      schoolId={context.school.id}
      schoolName={context.school.name}
      stats={stats}
      initialReports={reports}
      initialEscalations={escalations}
      routes={routes}
      log={log}
    />
  );
}
