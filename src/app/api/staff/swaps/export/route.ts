import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole, getStaffContext } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { csvCell } from "@/lib/integrations/starrez/csv";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Accepted swaps as a CSV for carrying out the moves in StarRez. Housing staff; audited. */
export async function GET() {
  const context = await getStaffContext();
  if (!context) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  const actorId = await assertRole(context.school.id, "managePairings");
  if (!actorId) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  if (!(await rateLimit(`export:${actorId}`, LIMITS.staffExportsPerHour))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const db = createAdminClient();
  const { data: proposals } = await db.from("swap_proposals").select("id, cycle, scores").eq("school_id", context.school.id).eq("status", "student_accepted");
  const ids = [...new Set((proposals ?? []).flatMap((p) => p.cycle))];
  const [{ data: people }, { data: settings }, { data: rooms }] = await Promise.all([
    ids.length ? db.from("profiles").select("id, first_name, last_initial").in("id", ids) : Promise.resolve({ data: [] as { id: string; first_name: string; last_initial: string }[] }),
    ids.length ? db.from("user_settings").select("user_id, email").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; email: string }[] }),
    ids.length ? db.from("assignments").select("user_id, building, room, external_ref").in("user_id", ids).is("closed_at", null) : Promise.resolve({ data: [] as { user_id: string; building: string; room: string | null; external_ref: string | null }[] }),
  ]);
  const header = ["SwapID", "Student", "Email", "ExternalRef", "FromBuilding", "FromRoom", "ToBuilding", "ToRoom"];
  const lines = [header.join(",")];
  for (const p of proposals ?? []) {
    const moves = ((p.scores as { moves?: Record<string, { toRoomOf: string }> } | null)?.moves ?? {});
    for (const id of p.cycle) {
      const person = (people ?? []).find((x) => x.id === id);
      const from = (rooms ?? []).find((r) => r.user_id === id);
      const to = (rooms ?? []).find((r) => r.user_id === moves[id]?.toRoomOf);
      lines.push(
        [p.id, person ? `${person.first_name} ${person.last_initial}.` : "", (settings ?? []).find((s) => s.user_id === id)?.email ?? "", from?.external_ref ?? "", from?.building ?? "", from?.room ?? "", to?.building ?? "", to?.room ?? ""]
          .map((v) => csvCell(v))
          .join(","),
      );
    }
  }
  await logAudit({ actorId, schoolId: context.school.id, action: "swaps_exported", entity: "swap_proposals", meta: { swaps: proposals?.length ?? 0 } });
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-swaps-${context.school.id}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
