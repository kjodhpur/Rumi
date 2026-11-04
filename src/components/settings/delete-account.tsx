"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { deleteAccount } from "@/app/actions/settings";
import { SettingsBack } from "./settings-ui";
import { useT } from "@/components/providers/i18n";

export function DeleteAccount() {
  const t = useT("settingsPages");
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
      <SettingsBack title={t("delete.title")} description={t("delete.description")} />
      <div className="rounded-lg bg-surface p-5 ring-1 ring-line">
        <p className="text-body-sm text-ink">{t("delete.removes")}</p>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-ink-2">
          <li>{t("delete.r1")}</li>
          <li>{t("delete.r2")}</li>
          <li>{t("delete.r3")}</li>
          <li>{t("delete.r4")}</li>
        </ul>
        <p className="mt-4 text-body-sm text-ink-2">
          {t("delete.copyFirst")}{" "}
          <a
            href="/api/account/export"
            download
            className="font-medium text-ink underline underline-offset-4"
          >
            {t("delete.download")}
          </a>
          {t("delete.pause")}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label={t("delete.confirmLabel")} error={error}>
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
        <Button
          type="submit"
          variant="danger"
          size="lg"
          loading={pending}
          disabled={confirm.trim().toUpperCase() !== "DELETE"}
        >
          {t("delete.submit")}
        </Button>
      </form>
    </div>
  );
}
