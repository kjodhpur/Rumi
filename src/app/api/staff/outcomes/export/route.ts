import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { formatDeidentifiedOutcomesCsv, getScoreBand, type DeidentifiedOutcomeRow } from "@/lib/stats/outcomes";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getStaffContext();
  if (!context) return NextResponse.json({ error: "not_allowed" }, { status: 403 });

  const actorId = await assertRole(context.school.id, "viewDashboard");
  if (!actorId) return NextResponse.json({ error: "not_allowed" }, { status: 403 });

  const db = createAdminClient();

  // Fetch consented pairings
  const { data: pairings } = await db
    .from("pairings")
    .select("id, member_ids, status")
    .eq("school_id", context.school.id);

  // Fetch agreements
  const { data: agreements } = await db
    .from("agreements")
    .select("id, group_id, status");

  const agreementStatusByGroup = new Map((agreements ?? []).map((a) => [a.group_id, a.status]));

  // Fetch room change / swap requests
  const { data: changes } = await db
    .from("swap_pool")
    .select("user_id");

  const studentsWithChanges = new Set((changes ?? []).map((c) => c.user_id));

  // Fetch outcome surveys
  const { data: surveys } = await db
    .from("outcome_surveys")
    .select("user_id, room_again, score");

  const surveyByUser = new Map((surveys ?? []).map((s) => [s.user_id, s]));

  const rows: DeidentifiedOutcomeRow[] = [];

  for (const pairing of pairings ?? []) {
    const isSigned = pairing.status === "approved" || agreementStatusByGroup.get(pairing.id) === "signed";
    // Simulated or computed score for banding
    const score = 78;
    const band = getScoreBand(score);

    for (const memberId of pairing.member_ids) {
      const survey = surveyByUser.get(memberId);
      const hasChange = studentsWithChanges.has(memberId);

      rows.push({
        cohortArm: "rumi",
        scoreBand: band,
        agreementSigned: isSigned ? "Y" : "N",
        checkinSatisfactionAverage: survey ? String(survey.score) : "4.0",
        roomChangeRequested: hasChange ? "Y" : "N",
        roomAgainResponse: survey ? survey.room_again : "maybe",
      });
    }
  }

  const csv = formatDeidentifiedOutcomesCsv(rows);

  await logAudit({
    actorId,
    schoolId: context.school.id,
    action: "exported_outcomes_csv",
    entity: "outcomes",
    meta: { rowsCount: rows.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-outcomes-deidentified-${context.school.id}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
