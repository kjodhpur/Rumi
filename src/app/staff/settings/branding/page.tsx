import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { logoUrl, parseBranding } from "@/lib/staff/branding";
import { PageHeader } from "@/components/layout/page-header";
import { BrandingSettings } from "@/components/staff/branding-settings";

export const metadata: Metadata = { title: "Branding" };
export const dynamic = "force-dynamic";

/** Phase 9 white-label: "Rumi for <School>" on staff screens and the school landing page. */
export default async function BrandingPage() {
  const context = await requireStaffPage("configureSchool");
  const { data: row } = await createAdminClient()
    .from("schools")
    .select("short_name, branding")
    .eq("id", context.school.id)
    .maybeSingle();
  const branding = parseBranding(row?.branding);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Branding"
        description="Your school's name, logo and an accent on staff screens and your landing page."
        className="pb-0 lg:pb-0"
      />
      <BrandingSettings
        canEdit={can(context, "configureSchool")}
        view={{
          schoolId: context.school.id,
          shortName: row?.short_name ?? context.school.shortName,
          displayName: branding.displayName ?? "",
          secondaryAccent: branding.secondaryAccent ?? "",
          logoUrl: logoUrl(branding.logoPath),
        }}
      />
    </div>
  );
}
