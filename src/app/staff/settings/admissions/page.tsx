import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { AdmissionsManager } from "@/components/staff/admissions-manager";

export const metadata: Metadata = { title: "Admitted students" };
export const dynamic = "force-dynamic";

/** Small counts are shown as "<5" like every other staff aggregate. */
const shown = (n: number | null) => (n && n > 0 && n < 5 ? "<5" : String(n ?? 0));

export default async function AdmissionsPage() {
  const context = await requireStaffPage("configureSchool");
  const school = context.school.id;
  const db = createAdminClient();
  const [{ data: row }, { data: terms }, listed, signedUp, withdrawn] = await Promise.all([
    db.from("schools").select("pre_arrival_enabled").eq("id", school).maybeSingle(),
    db
      .from("terms")
      .select("id, name, starts_on")
      .eq("school_id", school)
      .order("starts_on", { ascending: false }),
    db
      .from("admit_allowlist")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school)
      .is("withdrawn_at", null),
    db
      .from("admit_allowlist")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school)
      .is("withdrawn_at", null)
      .not("used_by", "is", null),
    db
      .from("admit_allowlist")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school)
      .not("withdrawn_at", "is", null),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admitted students"
        description="Let incoming students start matching before their school account exists."
        className="pb-0 lg:pb-0"
      />
      <AdmissionsManager
        schoolId={school}
        enabled={Boolean(row?.pre_arrival_enabled)}
        terms={(terms ?? []).map((t) => ({ id: t.id, name: t.name }))}
        stats={{
          listed: shown(listed.count),
          signedUp: shown(signedUp.count),
          withdrawn: shown(withdrawn.count),
        }}
      />
    </div>
  );
}
