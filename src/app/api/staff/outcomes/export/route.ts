import { NextResponse } from "next/server";
import { getStaffContext, assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { loadDeidentifiedRows } from "@/lib/staff/outcomes";
import { deidentifiedCsv } from "@/lib/stats/outcomes";

export const dynamic = "force-dynamic";

/** De-identified outcome rows for students who turned on research_outcomes. Audited. */
export async function GET() {
  const context = await getStaffContext();
  if (!context) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  const actorId = await assertRole(context.school.id, "viewDashboard");
  if (!actorId) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  if (!(await rateLimit(`export:${actorId}`, LIMITS.staffExportsPerHour))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const rows = await loadDeidentifiedRows(context.school.id);
  // Fewer than five research rows would be re-identifiable; export nothing.
  const csv = deidentifiedCsv(rows.length >= 5 ? rows : []);
  await logAudit({ actorId, schoolId: context.school.id, action: "outcomes_exported", entity: "outcomes", meta: { rows: rows.length >= 5 ? rows.length : 0 } });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-outcomes-deidentified-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
