import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/photos";
import { verifiedUntil } from "@/lib/verification";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { CONSENT_COPY, consentTitle, isConsentKind, visibleConsents } from "@/lib/consent";
import { decrypt } from "@/lib/crypto";

export const metadata: Metadata = { title: "Privacy & safety" };
export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  const user = (await getUser())!;
  const supabase = createClient();
  const [{ data: profile }, { data: blocks }, { data: consentRows }] = await Promise.all([
    supabase.from("profiles").select("is_hidden, verified_only, student_verified_at, school_id").eq("id", user.id).single(),
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", user.id).order("created_at", { ascending: false }),
    supabase.from("consents").select("id, kind, granted_at, revoked_at").eq("user_id", user.id).order("granted_at", { ascending: false }),
  ]);
  const { data: school } = await supabase
    .from("schools")
    .select("housing_office_name")
    .eq("id", profile?.school_id ?? "")
    .maybeSingle();
  const office = school?.housing_office_name ?? null;
  const { data: settings } = await supabase.from("user_settings").select("student_id_enc").eq("user_id", user.id).maybeSingle();
  let studentIdLast4: string | null = null;
  if (settings?.student_id_enc) {
    try {
      studentIdLast4 = decrypt(settings.student_id_enc).slice(-4);
    } catch {
      studentIdLast4 = null;
    }
  }
  const active = new Set((consentRows ?? []).filter((c) => !c.revoked_at).map((c) => c.kind));

  const ids = (blocks ?? []).map((b) => b.blocked_id);
  // Blocked people are hidden by the profile policy, so read their names with the service role.
  const { data: people } = ids.length
    ? await createAdminClient().from("profiles").select("id, first_name, last_initial, avatar_path").in("id", ids)
    : { data: [] as { id: string; first_name: string; last_initial: string; avatar_path: string | null }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <PrivacySettings
      initial={{ is_hidden: profile?.is_hidden ?? false, verified_only: profile?.verified_only ?? true }}
      verifiedUntil={verifiedUntil(profile?.student_verified_at)}
      consents={visibleConsents(office).map((kind) => ({
        kind,
        title: consentTitle(kind, office),
        shares: CONSENT_COPY[kind].shares,
        granted: active.has(kind),
      }))}
      consentHistory={(consentRows ?? []).flatMap((c) =>
        isConsentKind(c.kind)
          ? [{ id: c.id, title: consentTitle(c.kind, office), grantedAt: c.granted_at, revokedAt: c.revoked_at }]
          : [],
      )}
      studentIdLast4={studentIdLast4}
      blocked={ids.flatMap((id) => {
        const p = byId.get(id);
        return p ? [{ id, firstName: p.first_name, lastInitial: p.last_initial, avatarUrl: photoUrl(p.avatar_path) }] : [];
      })}
    />
  );
}
