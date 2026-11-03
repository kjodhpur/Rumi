import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { buildStarRezExport } from "@/lib/integrations/starrez/export";
import { logAudit } from "@/lib/staff/audit";
import { StarRezExport } from "@/components/staff/starrez-export";
import { StarRezRestSync } from "@/components/staff/starrez-rest-sync";

export const metadata: Metadata = { title: "StarRez integration" };

export default async function StarRezExportPage() {
  const context = await requireStaffPage("export");
  const { pairingIds: _ids, ...preview } = await buildStarRezExport(context.school.id);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_starrez_export",
    entity: "pairing",
    meta: { students: preview.rows.length },
  });
  return (
    <div className="space-y-10">
      <StarRezExport schoolId={context.school.id} preview={preview} />
      <StarRezRestSync schoolId={context.school.id} />
    </div>
  );
}
