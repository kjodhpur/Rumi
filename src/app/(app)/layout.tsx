import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient, getUser } from "@/lib/supabase/server";
import { getBadgeCounts } from "@/app/actions/badges";
import { photoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const [{ data: profile }, { data: admin }, counts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_initial, avatar_path, onboarding_completed_at, banned_at")
      .eq("id", user.id)
      .single(),
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    getBadgeCounts(),
  ]);

  if (!profile) redirect("/login");
  if (profile.banned_at) redirect("/suspended");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  return (
    <AppShell
      user={{
        id: profile.id,
        firstName: profile.first_name,
        lastInitial: profile.last_initial,
        avatarUrl: photoUrl(profile.avatar_path),
        isAdmin: Boolean(admin),
      }}
      initialCounts={counts}
    >
      {children}
    </AppShell>
  );
}
