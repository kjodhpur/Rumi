import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { loadMatrix } from "@/lib/notifications/dispatch";
import { NotificationSettings } from "@/components/settings/notification-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("settingsPages"))("notifications.title") };
}
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = (await getUser())!;
  const [matrix, { data: settings }, { data: pending }] = await Promise.all([
    loadMatrix(user.id),
    createClient()
      .from("user_settings")
      .select("email, phone_last4, phone_verified_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    createAdminClient()
      .from("phone_verifications")
      .select("expires_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  return (
    <NotificationSettings
      matrix={matrix}
      email={settings?.email ?? user.email ?? ""}
      sms={{
        available: serverEnv.sms.enabled,
        last4: settings?.phone_last4 ?? null,
        verified: Boolean(settings?.phone_verified_at),
        codeSent: Boolean(pending && Date.parse(pending.expires_at) > Date.now()),
      }}
      pushAvailable={publicEnv.pushEnabled}
    />
  );
}
