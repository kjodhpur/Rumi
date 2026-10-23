"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateNotificationSettings } from "@/app/actions/settings";
import { SettingsBack, SettingsSection, SettingsToggleRow } from "./settings-ui";

type Key =
  | "notify_inapp_intros"
  | "notify_inapp_messages"
  | "notify_inapp_matches"
  | "notify_inapp_groups"
  | "notify_email_intros"
  | "notify_email_messages"
  | "notify_email_matches"
  | "notify_email_groups";

const ROWS: { kind: string; label: string; description: string }[] = [
  { kind: "intros", label: "Intros", description: "When someone sends you an intro or accepts yours" },
  { kind: "messages", label: "Messages", description: "New messages in your chats" },
  { kind: "matches", label: "Strong new matches", description: "When someone who fits you really well joins" },
  { kind: "groups", label: "Groups", description: "Invites, join requests and new members" },
];

export function NotificationSettings({ initial, email }: { initial: Record<Key, boolean>; email: string }) {
  const [values, setValues] = React.useState(initial);

  async function toggle(key: Key, value: boolean) {
    setValues((v) => ({ ...v, [key]: value }));
    const result = await updateNotificationSettings({ [key]: value });
    if (!result.ok) {
      setValues((v) => ({ ...v, [key]: !value }));
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title="Notifications" description="Choose what reaches you, and where." />
      <SettingsSection title="In the app" footer="Shown in your notifications and as live toasts while you use Rumi.">
        {ROWS.map((row) => (
          <SettingsToggleRow
            key={row.kind}
            label={row.label}
            description={row.description}
            checked={values[`notify_inapp_${row.kind}` as Key]}
            onCheckedChange={(v) => void toggle(`notify_inapp_${row.kind}` as Key, v)}
          />
        ))}
      </SettingsSection>
      <SettingsSection
        title="Email"
        footer={`Sent to ${email}. Message emails are bundled — at most one per chat every 30 minutes, and never while you're active.`}
      >
        {ROWS.map((row) => (
          <SettingsToggleRow
            key={row.kind}
            label={row.label}
            description={row.kind === "matches" ? "A daily digest, only when there's someone new" : row.description}
            checked={values[`notify_email_${row.kind}` as Key]}
            onCheckedChange={(v) => void toggle(`notify_email_${row.kind}` as Key, v)}
          />
        ))}
      </SettingsSection>
    </div>
  );
}
