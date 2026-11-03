import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadTeam } from "@/lib/staff/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamManager } from "@/components/staff/team-manager";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const context = await requireStaffPage("manageTeam");
  const [{ members, invites }, { data: school }] = await Promise.all([
    loadTeam(context.school.id),
    createAdminClient().from("schools").select("email_domains").eq("id", context.school.id).single(),
  ]);
  return (
    <TeamManager
      schoolId={context.school.id}
      domains={school?.email_domains ?? []}
      currentUserId={context.userId}
      members={members}
      invites={invites}
    />
  );
}
