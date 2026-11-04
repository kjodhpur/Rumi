import { requireStaffPage, can } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadStaffEscalationRoutes } from "@/lib/staff/safety";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { EscalationRoutesManager } from "@/components/staff/escalation-routes-manager";
import { AiScreeningSetting } from "@/components/staff/ai-screening-setting";

export default async function EscalationSettingsPage() {
  const context = await requireStaffPage("configureEscalation");

  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "escalation_settings_viewed",
    entity: "escalation_route",
  });

  const [routes, { data: school }] = await Promise.all([
    loadStaffEscalationRoutes(context.school.id),
    createAdminClient()
      .from("schools")
      .select("ai_moderation_enabled")
      .eq("id", context.school.id)
      .maybeSingle(),
  ]);
  const ai = serverEnv.aiModeration;

  return (
    <div className="flex flex-col gap-8">
      <EscalationRoutesManager
        schoolId={context.school.id}
        schoolName={context.school.name}
        initialRoutes={routes}
      />
      <AiScreeningSetting
        schoolId={context.school.id}
        enabled={school?.ai_moderation_enabled ?? false}
        available={ai.enabled && Boolean(ai.apiKey)}
        canEdit={can(context, "configureSchool")}
      />
    </div>
  );
}
