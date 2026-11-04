import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { loadProfileDrafts } from "@/lib/onboarding-data";
import { ProfileEditor } from "@/components/settings/profile-editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("settingsPages"))("editor.title") };
}
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = (await getUser())!;
  const loaded = await loadProfileDrafts(user.id);
  if (!loaded) redirect("/login");
  return <ProfileEditor data={{ ...loaded.data, initialStep: 0 }} />;
}
