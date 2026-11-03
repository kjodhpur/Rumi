import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadUnmatched } from "@/lib/staff/dashboard";
import { logAudit } from "@/lib/staff/audit";
import { UnmatchedStudents } from "@/components/staff/unmatched-students";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const context = await requireStaffPage("viewStudents");
  const students = await loadUnmatched(context.school.id);
  // Opening a list of named students is a read of student-level data.
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_unmatched_students",
    entity: "student_list",
    meta: { count: students?.length ?? 0 },
  });
  return (
    <UnmatchedStudents
      schoolId={context.school.id}
      office={context.school.housingOfficeName}
      students={students}
    />
  );
}
