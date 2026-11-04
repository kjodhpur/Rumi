"use client";

import * as React from "react";
import { toast } from "sonner";
import { setConsent } from "@/app/actions/consent";
import { setStudentId } from "@/app/actions/student-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConsentKind } from "@/lib/consent";
import { SettingsSection, SettingsToggleRow } from "./settings-ui";
import { useIntlLocale, useT } from "@/components/providers/i18n";

export interface ConsentRow {
  kind: ConsentKind;
  title: string;
  shares: string;
  granted: boolean;
}

export interface ConsentEvent {
  id: string;
  title: string;
  grantedAt: string;
  revokedAt: string | null;
}

const date = (iso: string, intl: string) =>
  new Date(iso).toLocaleDateString(intl, { month: "short", day: "numeric", year: "numeric" });

/** Privacy center: every consent, what it shares, and when it changed. */
export function ConsentSettings({
  consents,
  history,
  studentIdLast4,
}: {
  consents: ConsentRow[];
  history: ConsentEvent[];
  /** Last 4 characters of the saved student ID, or null. */
  studentIdLast4: string | null;
}) {
  const t = useT("privacy");
  const intl = useIntlLocale();
  const [values, setValues] = React.useState(() =>
    Object.fromEntries(consents.map((c) => [c.kind, c.granted])),
  );

  async function toggle(row: ConsentRow, value: boolean) {
    setValues((v) => ({ ...v, [row.kind]: value }));
    const result = await setConsent(row.kind, value);
    if (!result.ok) {
      setValues((v) => ({ ...v, [row.kind]: !value }));
      toast.error(result.error);
      return;
    }
    toast.success(value ? t("consents.on") : t("consents.off"), {
      description: !value && row.kind === "share_with_housing" ? t("consents.offHint") : undefined,
    });
  }

  if (consents.length === 0) return null;

  return (
    <>
      <SettingsSection title={t("consents.title")} footer={t("consents.footer")}>
        {consents.map((row) => (
          <SettingsToggleRow
            key={row.kind}
            label={row.title}
            description={row.shares}
            checked={values[row.kind] ?? false}
            onCheckedChange={(v) => void toggle(row, v)}
          />
        ))}
        {consents.some((c) => c.kind === "share_with_housing") ? (
          <StudentIdRow initialLast4={studentIdLast4} />
        ) : null}
      </SettingsSection>

      {history.length > 0 ? (
        <SettingsSection title={t("consents.history")}>
          <ul className="divide-y divide-line">
            {history.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-body-sm text-ink">{event.title}</span>
                <span className="text-caption text-ink-3 tabular-nums">
                  {t("consents.onSince", { date: date(event.grantedAt, intl) })}
                  {event.revokedAt
                    ? t("consents.offOn", { date: date(event.revokedAt, intl) })
                    : t("consents.stillOn")}
                </span>
              </li>
            ))}
          </ul>
        </SettingsSection>
      ) : null}
    </>
  );
}

function StudentIdRow({ initialLast4 }: { initialLast4: string | null }) {
  const t = useT("privacy");
  const [last4, setLast4] = React.useState(initialLast4);
  const [editing, setEditing] = React.useState(!initialLast4);
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const id = React.useId();

  async function save(next: string | null) {
    setPending(true);
    const result = await setStudentId(next);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    setLast4(result.data.last4);
    setValue("");
    setEditing(!result.data.last4);
    toast.success(
      result.data.last4 ? t("consents.studentIdSaved") : t("consents.studentIdRemoved"),
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div>
        <label htmlFor={id} className="text-body-sm font-medium text-ink">
          {t("consents.studentId")}{" "}
          <span className="font-normal text-ink-3">{t("consents.optional")}</span>
        </label>
        <p id={`${id}-help`} className="mt-0.5 text-body-sm text-ink-2">
          {t("consents.studentIdHelp")}
        </p>
      </div>
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(value);
          }}
        >
          <Input
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            aria-describedby={`${id}-help`}
            className="max-w-[220px]"
          />
          <Button type="submit" variant="secondary" loading={pending} disabled={!value.trim()}>
            {t("consents.save")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body-sm text-ink tabular-nums">
            {t("consents.endingIn", { last4: last4 ?? "" })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {t("consents.change")}
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            loading={pending}
            onClick={() => void save(null)}
          >
            {t("consents.remove")}
          </Button>
        </div>
      )}
    </div>
  );
}
