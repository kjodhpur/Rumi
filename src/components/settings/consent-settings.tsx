"use client";

import * as React from "react";
import { toast } from "sonner";
import { setConsent } from "@/app/actions/consent";
import type { ConsentKind } from "@/lib/consent";
import { SettingsSection, SettingsToggleRow } from "./settings-ui";

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

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Privacy center: every consent, what it shares, and when it changed. */
export function ConsentSettings({ consents, history }: { consents: ConsentRow[]; history: ConsentEvent[] }) {
  const [values, setValues] = React.useState(() => Object.fromEntries(consents.map((c) => [c.kind, c.granted])));

  async function toggle(row: ConsentRow, value: boolean) {
    setValues((v) => ({ ...v, [row.kind]: value }));
    const result = await setConsent(row.kind, value);
    if (!result.ok) {
      setValues((v) => ({ ...v, [row.kind]: !value }));
      toast.error(result.error);
      return;
    }
    toast.success(value ? "Sharing turned on" : "Sharing turned off", {
      description: value ? undefined : "Staff no longer see your individual results.",
    });
  }

  if (consents.length === 0) return null;

  return (
    <>
      <SettingsSection
        title="Sharing with your school"
        footer="Staff always see totals that include everyone. These switches decide whether they also see your own results."
      >
        {consents.map((row) => (
          <SettingsToggleRow
            key={row.kind}
            label={row.title}
            description={row.shares}
            checked={values[row.kind] ?? false}
            onCheckedChange={(v) => void toggle(row, v)}
          />
        ))}
      </SettingsSection>

      {history.length > 0 ? (
        <SettingsSection title="Sharing history">
          <ul className="divide-y divide-line">
            {history.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-body-sm text-ink">{event.title}</span>
                <span className="text-caption text-ink-3 tabular-nums">
                  On {date(event.grantedAt)}
                  {event.revokedAt ? ` · off ${date(event.revokedAt)}` : " · still on"}
                </span>
              </li>
            ))}
          </ul>
        </SettingsSection>
      ) : null}
    </>
  );
}
