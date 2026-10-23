import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { loadProfileDrafts } from "@/lib/onboarding-data";
import { ProfileEditor } from "@/components/settings/profile-editor";

export const metadata: Metadata = { title: "Profile & preferences" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = (await getUser())!;
  const loaded = await loadProfileDrafts(user.id);
  if (!loaded) redirect("/login");
  return <ProfileEditor data={{ ...loaded.data, initialStep: 0 }} />;
}
