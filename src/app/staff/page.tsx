import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/staff/context";
import { loadAudit, loadRetention, loadTeam } from "@/lib/staff/team";
import { loadActiveTerm, loadOverview, nextDeadline } from "@/lib/staff/dashboard";
import { StaffHome } from "@/components/staff/staff-home";

export const metadata: Metadata = { title: "Overview" };

const WEEKS = [8, 16, 52];

export default async function StaffHomePage({ searchParams }: { searchParams: { weeks?: string } }) {
  const context = await requireStaffPage("home");
  const admin = can(context, "manageTeam");
  const weeks = WEEKS.includes(Number(searchParams.weeks)) ? Number(searchParams.weeks) : 16;
  const [team, retention, audit, term, overview] = await Promise.all([
    loadTeam(context.school.id),
    admin ? loadRetention(context.school.id) : Promise.resolve(null),
    can(context, "viewAudit") ? loadAudit(context.school.id) : Promise.resolve(null),
    loadActiveTerm(context.school.id),
    can(context, "viewDashboard") ? loadOverview(context.school.id, weeks) : Promise.resolve(null),
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
        term: Boolean(term),
      }}
      term={term ? { name: term.name, deadline: nextDeadline(term) } : null}
      overview={overview}
      weeks={weeks}
      canSeeStudents={can(context, "viewStudents")}
      members={team.members.filter((m) => !m.disabled).map((m) => ({ id: m.id, name: m.name, role: m.role }))}
      recent={(audit?.rows ?? []).slice(0, 6)}
    />
  );
}
