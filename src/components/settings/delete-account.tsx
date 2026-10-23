"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { deleteAccount } from "@/app/actions/settings";
import { SettingsBack } from "./settings-ui";

export function DeleteAccount() {
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await deleteAccount(confirm);
    // On success the action redirects; we only get here on failure.
    setPending(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-8">
      <SettingsBack title="Delete account" description="This can't be undone." />
      <div className="rounded-lg bg-surface p-5 ring-1 ring-line">
        <p className="text-body-sm text-ink">Deleting your account permanently removes:</p>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-ink-2">
          <li>Your profile, photos and preferences</li>
          <li>Your matches, saves, intros and direct messages</li>
          <li>Your Spotify connection and notification history</li>
          <li>Your spot in any group (ownership passes to another member)</li>
        </ul>
        <p className="mt-4 text-body-sm text-ink-2">
          Want a copy first?{" "}
          <a href="/api/account/export" download className="font-medium text-ink underline underline-offset-4">
            Download your data
          </a>
          . Just need a break? You can hide your profile in Privacy instead.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label='Type "DELETE" to confirm' error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Button type="submit" variant="danger" size="lg" loading={pending} disabled={confirm.trim().toUpperCase() !== "DELETE"}>
          Permanently delete my account
        </Button>
      </form>
    </div>
  );
}
