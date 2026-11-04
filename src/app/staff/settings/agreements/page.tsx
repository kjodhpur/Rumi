import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultTemplate, parseTemplate } from "@/lib/agreements/template";
import { PageHeader } from "@/components/layout/page-header";
import { AgreementTemplateEditor } from "@/components/staff/agreement-template-editor";

export const metadata: Metadata = { title: "Agreement template" };
export const dynamic = "force-dynamic";

export default async function AgreementTemplatePage() {
  const context = await requireStaffPage("configureSchool");
  const { data: latest } = await createAdminClient()
    .from("agreement_templates")
    .select("version, sections")
    .eq("school_id", context.school.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agreement template"
        description="The roommate agreement your students start from."
        className="pb-0 lg:pb-0"
      />
      <AgreementTemplateEditor
        schoolId={context.school.id}
        version={latest?.version ?? null}
        initial={parseTemplate(latest?.sections ?? null) ?? defaultTemplate()}
      />
    </div>
  );
}
