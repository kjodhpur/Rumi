import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/staff/context";
import { loadAudit, loadRetention, loadTeam } from "@/lib/staff/team";
import { StaffHome } from "@/components/staff/staff-home";

export const metadata: Metadata = { title: "Overview" };

export default async function StaffHomePage() {
  const context = await requireStaffPage("home");
  const admin = can(context, "manageTeam");
  const [team, retention, audit] = await Promise.all([
    loadTeam(context.school.id),
    admin ? loadRetention(context.school.id) : Promise.resolve(null),
    can(context, "viewAudit") ? loadAudit(context.school.id) : Promise.resolve(null),
  ]);

  return (
    <StaffHome
      firstName={context.firstName}
      schoolName={context.school.name}
      office={context.school.housingOfficeName}
      showSetup={admin}
      checklist={{
        team: team.members.filter((m) => !m.disabled).length > 1 || team.invites.length > 0,
        retention: (retention?.customized.length ?? 0) > 0,
      }}
      members={team.members.filter((m) => !m.disabled).map((m) => ({ id: m.id, name: m.name, role: m.role }))}
      recent={(audit?.rows ?? []).slice(0, 6)}
    />
  );
}
