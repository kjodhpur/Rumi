import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadStaffEscalationRoutes } from "@/lib/staff/safety";
import { EscalationRoutesManager } from "@/components/staff/escalation-routes-manager";

export default async function EscalationSettingsPage() {
  const context = await requireStaffPage("configureEscalation");

  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "escalation_settings_viewed",
    entity: "escalation_route",
  });

  const routes = await loadStaffEscalationRoutes(context.school.id);

  return (
    <EscalationRoutesManager
      schoolId={context.school.id}
      schoolName={context.school.name}
      initialRoutes={routes}
    />
  );
}
