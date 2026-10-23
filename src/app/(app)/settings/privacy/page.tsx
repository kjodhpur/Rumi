import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/photos";
import { verifiedUntil } from "@/lib/verification";
import { PrivacySettings } from "@/components/settings/privacy-settings";

export const metadata: Metadata = { title: "Privacy & safety" };
export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  const user = (await getUser())!;
  const supabase = createClient();
  const [{ data: profile }, { data: blocks }] = await Promise.all([
    supabase.from("profiles").select("is_hidden, verified_only, student_verified_at").eq("id", user.id).single(),
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", user.id).order("created_at", { ascending: false }),
  ]);

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
      blocked={ids.flatMap((id) => {
        const p = byId.get(id);
        return p ? [{ id, firstName: p.first_name, lastInitial: p.last_initial, avatarUrl: photoUrl(p.avatar_path) }] : [];
      })}
    />
  );
}
