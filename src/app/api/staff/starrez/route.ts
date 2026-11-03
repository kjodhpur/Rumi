import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole, getStaffContext } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { buildStarRezExport } from "@/lib/integrations/starrez/export";
import { toCsv } from "@/lib/integrations/starrez/csv";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Downloads approved pairings as a StarRez roommate-group CSV. Housing admins only; every export is audited. */
export async function GET() {
  const context = await getStaffContext();
  if (!context) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  const actorId = await assertRole(context.school.id, "export");
  if (!actorId) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  if (!(await rateLimit(`export:${actorId}`, LIMITS.staffExportsPerHour))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const preview = await buildStarRezExport(context.school.id);
  const csv = toCsv(preview.columns, preview.rows);
  if (preview.pairingIds.length) {
    await createAdminClient().from("pairings").update({ exported_at: new Date().toISOString() }).in("id", preview.pairingIds);
  }
  await logAudit({
    actorId,
    schoolId: context.school.id,
    action: "starrez_exported",
    entity: "pairing",
    meta: { groups: preview.groups, students: preview.rows.length, skipped: preview.skipped.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-starrez-${context.school.id}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
