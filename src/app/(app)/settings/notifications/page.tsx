import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { NotificationSettings } from "@/components/settings/notification-settings";

export const metadata: Metadata = { title: "Notification settings" };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = (await getUser())!;
  const { data } = await createClient()
    .from("user_settings")
    .select(
      "email, notify_inapp_intros, notify_inapp_messages, notify_inapp_matches, notify_inapp_groups, notify_email_intros, notify_email_messages, notify_email_matches, notify_email_groups",
    )
    .eq("user_id", user.id)
    .single();

  const { email = user.email ?? "", ...initial } = data ?? {
    notify_inapp_intros: true,
    notify_inapp_messages: true,
    notify_inapp_matches: true,
    notify_inapp_groups: true,
    notify_email_intros: true,
    notify_email_messages: true,
    notify_email_matches: true,
    notify_email_groups: true,
  };
  return <NotificationSettings initial={initial} email={email} />;
}
