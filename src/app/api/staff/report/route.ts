import { NextResponse } from "next/server";
import { can, getStaffContext } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadTermReport } from "@/lib/staff/term-report-load";
import { reportRows } from "@/lib/staff/term-report";
import { csvLine } from "@/lib/csv/parse";

export const dynamic = "force-dynamic";

/** The term report as CSV (aggregates only; small counts read "<5"). */
export async function GET() {
  const context = await getStaffContext();
  if (!context || !can(context, "viewDashboard"))
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  const report = await loadTermReport(context);
  const lines = [
    csvLine(["Section", "Measure", "Value", "Out of", "Note"]),
    ...reportRows(report).map((r) => csvLine([r.section, r.measure, r.value, r.n, r.note])),
  ];
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "term_report_exported",
    entity: "term_report",
    meta: { format: "csv" },
  });
  const name = `rumi-term-report-${context.school.id}-${report.generatedAt}.csv`;
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
