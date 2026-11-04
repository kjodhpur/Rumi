import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { samlServiceProvider } from "@/lib/auth/sso";
import { PageHeader } from "@/components/layout/page-header";
import { SsoSettings } from "@/components/staff/sso-settings";

export const metadata: Metadata = { title: "Single sign-on" };
export const dynamic = "force-dynamic";

export default async function SsoPage() {
  const context = await requireStaffPage("configureSchool");
  const { data: row } = await createAdminClient()
    .from("schools")
    .select("sso_provider, sso_provider_id, sso_domain, otp_enabled")
    .eq("id", context.school.id)
    .maybeSingle();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Single sign-on"
        description="Let students sign in with your school's identity provider instead of an emailed code."
        className="pb-0 lg:pb-0"
      />
      <SsoSettings
        schoolId={context.school.id}
        canEdit
        isRumiTeam={context.isPlatformAdmin}
        view={{
          featureOn: publicEnv.ssoEnabled,
          provider:
            row?.sso_provider === "oidc" ? "oidc" : row?.sso_provider === "saml" ? "saml" : null,
          providerId: row?.sso_provider_id ?? null,
          domain: row?.sso_domain ?? null,
          otpEnabled: row?.otp_enabled ?? true,
          sp: samlServiceProvider(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
        }}
      />
    </div>
  );
}
