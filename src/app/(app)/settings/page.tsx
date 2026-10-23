import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";
import { verifiedUntil } from "@/lib/verification";
import { SettingsIndex } from "@/components/settings/settings-index";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await getUser())!;
  const supabase = createClient();
  const [{ data: profile }, { data: settings }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_initial, avatar_path, student_verified_at").eq("id", user.id).single(),
    supabase.from("user_settings").select("email").eq("user_id", user.id).single(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <SettingsIndex
      user={{
        id: user.id,
        firstName: profile?.first_name ?? "",
        lastInitial: profile?.last_initial ?? "",
        avatarUrl: photoUrl(profile?.avatar_path ?? null),
        email: settings?.email ?? user.email ?? "",
        verifiedUntil: verifiedUntil(profile?.student_verified_at),
        isAdmin: Boolean(admin),
      }}
    />
  );
}
