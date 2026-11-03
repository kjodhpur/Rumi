import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { buildStarRezExport } from "@/lib/integrations/starrez/export";
import { loadImportMapping, loadRestSettings } from "@/lib/integrations/starrez/sync";
import { logAudit } from "@/lib/staff/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRezExport } from "@/components/staff/starrez-export";
import { StarRezImport, type ImportJobView } from "@/components/staff/starrez-import";
import { StarRezQuestionnaire } from "@/components/staff/starrez-questionnaire";
import { StarRezRestSync, type IntegrationRunView } from "@/components/staff/starrez-rest-sync";

export const metadata: Metadata = { title: "StarRez" };
export const dynamic = "force-dynamic";

const TABS = ["export", "import", "questionnaire", "connection"] as const;

export default async function StarRezPage({ searchParams }: { searchParams: { tab?: string } }) {
  const context = await requireStaffPage("export");
  const db = createAdminClient();
  const [{ pairingIds: _ids, ...preview }, assignmentMapping, questionMapping, settings, { data: jobs }, { data: runs }] = await Promise.all([
    buildStarRezExport(context.school.id),
    loadImportMapping(context.school.id, "import_assignments"),
    loadImportMapping(context.school.id, "import_questionnaire"),
    loadRestSettings(context.school.id),
    db.from("import_jobs").select("id, kind, file_name, status, counts, created_at").eq("school_id", context.school.id).order("created_at", { ascending: false }).limit(10),
    db.from("integration_runs").select("id, action, status, records_processed, calls, errors, created_at").eq("school_id", context.school.id).order("created_at", { ascending: false }).limit(10),
  ]);
  await logAudit({ actorId: context.userId, schoolId: context.school.id, action: "viewed_starrez_export", entity: "pairing", meta: { students: preview.rows.length } });

  const jobViews: ImportJobView[] = (jobs ?? []).map((j) => {
    const counts = (j.counts ?? {}) as { inserts?: number; updates?: number; errors?: number };
    return { id: j.id, kind: j.kind as ImportJobView["kind"], fileName: j.file_name, status: j.status as ImportJobView["status"], createdAt: j.created_at, inserts: counts.inserts ?? 0, updates: counts.updates ?? 0, errors: counts.errors ?? 0 };
  });
  const runViews: IntegrationRunView[] = (runs ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    status: r.status as IntegrationRunView["status"],
    processed: r.records_processed,
    calls: r.calls,
    errors: Array.isArray(r.errors) ? (r.errors as { id: string; error: string }[]) : [],
    createdAt: r.created_at,
  }));
  const tab = TABS.includes(searchParams.tab as (typeof TABS)[number]) ? searchParams.tab! : "export";

  return (
    <Tabs defaultValue={tab}>
      <TabsList className="scrollbar-none mb-8 overflow-x-auto">
        <TabsTrigger value="export">Export groups</TabsTrigger>
        <TabsTrigger value="import">Import assignments</TabsTrigger>
        <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
        <TabsTrigger value="connection">REST connection</TabsTrigger>
      </TabsList>
      <TabsContent value="export" className="outline-none">
        <StarRezExport schoolId={context.school.id} preview={preview} />
      </TabsContent>
      <TabsContent value="import" className="outline-none">
        <StarRezImport schoolId={context.school.id} mapping={assignmentMapping} jobs={jobViews} />
      </TabsContent>
      <TabsContent value="questionnaire" className="outline-none">
        <StarRezQuestionnaire schoolId={context.school.id} mapping={questionMapping} />
      </TabsContent>
      <TabsContent value="connection" className="outline-none">
        <StarRezRestSync schoolId={context.school.id} settings={settings} runs={runViews} />
      </TabsContent>
    </Tabs>
  );
}
