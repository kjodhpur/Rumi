import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { RaWorkspaceView, type RaAlert } from "@/components/staff/ra-workspace-view";

export const metadata: Metadata = { title: "RA workspace" };
export const dynamic = "force-dynamic";

/**
 * The RA list comes from ra_risk_list, which applies building scope and consent in SQL.
 * Cases, notes and tasks are read through RLS with the same rules. Every view is audited.
 */
export default async function RaPage() {
  const context = await requireStaffPage("raWorkspace");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ra_risk_list", { p_school: context.school.id });
  if (error) return <ErrorState title="Couldn't load check-ins" description="Refresh the page to try again." />;

  const caseIds = (data ?? []).map((r) => r.case_id).filter((id): id is string => Boolean(id));
  const [{ data: notes }, { data: tasks }] = await Promise.all([
    caseIds.length ? supabase.from("ra_case_notes").select("id, case_id, body, created_at, profiles(first_name)").in("case_id", caseIds).order("created_at") : Promise.resolve({ data: [] }),
    caseIds.length ? supabase.from("ra_tasks").select("id, case_id, title, due_on, done_at").in("case_id", caseIds).order("created_at") : Promise.resolve({ data: [] }),
  ]);

  const alerts: RaAlert[] = (data ?? []).map((r) => {
    let note: string | null = null;
    if (r.note_enc) {
      try {
        note = decrypt(r.note_enc);
      } catch {
        note = null;
      }
    }
    return {
      assignmentId: r.assignment_id,
      studentName: `${r.first_name}${r.last_initial ? ` ${r.last_initial}.` : ""}`,
      building: r.building,
      room: r.room,
      level: r.level as RaAlert["level"],
      reasons: r.reasons ?? [],
      score: r.score,
      tags: r.tags ?? [],
      note,
      askedForHelp: r.ask_ra,
      submittedAt: r.submitted_at,
      groupId: r.group_id,
      caseId: r.case_id,
      caseStatus: (r.case_status as RaAlert["caseStatus"]) ?? null,
      notes: (notes ?? [])
        .filter((n) => n.case_id === r.case_id)
        .map((n) => ({ id: n.id, body: n.body, at: n.created_at, author: (n.profiles as { first_name: string } | null)?.first_name ?? "Staff" })),
      tasks: (tasks ?? []).filter((t) => t.case_id === r.case_id).map((t) => ({ id: t.id, title: t.title, dueOn: t.due_on, done: Boolean(t.done_at) })),
    };
  });

  await logAudit({ actorId: context.userId, schoolId: context.school.id, action: "viewed_ra_risk_list", entity: "checkin_list", meta: { count: alerts.length } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check-ins"
        description={
          context.role === "ra"
            ? `Your buildings: ${context.scopes.buildings.join(", ") || "none assigned yet"}. Only students who shared a check-in or asked for help appear here.`
            : "Medium and high risk, and anyone who asked for help. Only students who shared their check-in, or asked, appear here."
        }
        className="pb-0 lg:pb-0"
      />
      <RaWorkspaceView schoolId={context.school.id} alerts={alerts} />
    </div>
  );
}
