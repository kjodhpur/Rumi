"use client";

import * as React from "react";
import { toast } from "sonner";
import { setConsent } from "@/app/actions/consent";
import { setStudentId } from "@/app/actions/student-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        {consents.some((c) => c.kind === "share_with_housing") ? <StudentIdRow initialLast4={studentIdLast4} /> : null}
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

function StudentIdRow({ initialLast4 }: { initialLast4: string | null }) {
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
    toast.success(result.data.last4 ? "Student ID saved" : "Student ID removed");
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div>
        <label htmlFor={id} className="text-body-sm font-medium text-ink">
          Student ID <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <p id={`${id}-help`} className="mt-0.5 text-body-sm text-ink-2">
          Helps your housing office match your Rumi group to your housing application. Stored encrypted and shared only while sharing is on.
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
            Save
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body-sm text-ink tabular-nums">Ending in {last4}</span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Change
          </Button>
          <Button variant="danger-ghost" size="sm" loading={pending} onClick={() => void save(null)}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
