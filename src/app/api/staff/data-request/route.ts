import { NextResponse, type NextRequest } from "next/server";
import { can, getStaffContext } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { collectAccountData } from "@/lib/account/export";
import { basisProblem, findSchoolStudent, type RequestBasis } from "@/lib/staff/data-requests";

export const dynamic = "force-dynamic";

/**
 * Housing admin data-subject export (0.2). POST so the student's email never sits in a URL.
 * Needs the student's sharing consent or a written legal basis; every export is audited.
 */
export async function POST(request: NextRequest) {
  const context = await getStaffContext();
  if (!context || !can(context, "managePrivacy"))
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  if (!(await rateLimit(`staff-exports:${context.userId}`, LIMITS.staffExportsPerHour)))
    return NextResponse.json({ error: "Too many exports. Try again later." }, { status: 429 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const basis: RequestBasis = form.get("basis") === "legal" ? "legal" : "consent";
  const reason = String(form.get("reason") ?? "").slice(0, 500);
  const student = await findSchoolStudent(context.school.id, email);
  if (!student)
    return NextResponse.json(
      { error: "No student at your school uses that email." },
      { status: 404 },
    );
  const problem = basisProblem(basis, student.consented, reason);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const data = await collectAccountData(student.id, "staff");
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "student_data_exported",
    entity: "profile",
    entityId: student.id,
    meta: { basis, reason: basis === "legal" ? reason : null },
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-student-record-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
