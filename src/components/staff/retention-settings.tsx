"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRetention } from "@/app/actions/staff";
import {
  RETENTION_COPY,
  RETENTION_DEFAULTS,
  type RetentionEntity,
  type RetentionPolicy,
} from "@/lib/retention/policy";

// Check-in notes appear once check-ins ship; until then the period has nothing to govern.
const EDITABLE: RetentionEntity[] = ["orphaned_messages", "inactive_accounts", "inactive_warning", "audit_log"];

export function RetentionSettings({
  schoolId,
  office,
  policy,
}: {
  schoolId: string;
  office: string | null;
  policy: RetentionPolicy;
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Privacy & retention"
        description="How long Rumi keeps data for your school, and what students have agreed to share."
        className="pb-0 lg:pb-0"
      />

      <section aria-labelledby="sharing-title" className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
        <h2 id="sharing-title" className="text-title font-semibold text-ink">
          What staff can see
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5 text-body-sm text-ink-2">
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
            Totals and charts that include every student. Any group smaller than 5 shows as &ldquo;&lt;5&rdquo;.
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
            {office
              ? `Individual results only for students who chose to share them with ${office}. Turning it off removes them right away.`
              : "Individual results only after your pilot agreement is signed and a student chooses to share them."}
          </li>
          <li className="flex gap-2.5">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
            Never messages, photos, email addresses or exact answers.
          </li>
        </ul>
      </section>

      <section aria-labelledby="retention-title" className="flex flex-col gap-3">
        <div>
          <h2 id="retention-title" className="text-title font-semibold text-ink">
            Retention
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">Rumi deletes data automatically every night once these periods pass.</p>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
          {EDITABLE.map((entity) => (
            <RetentionRow key={entity} schoolId={schoolId} entity={entity} days={policy[entity]} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function RetentionRow({ schoolId, entity, days }: { schoolId: string; entity: RetentionEntity; days: number }) {
  const router = useRouter();
  const copy = RETENTION_COPY[entity];
  const [value, setValue] = React.useState(String(days));
  const [pending, setPending] = React.useState(false);
  const id = `retention-${entity}`;
  const dirty = Number(value) !== days;

  async function save() {
    setPending(true);
    const result = await updateRetention({ schoolId, entity, days: Number(value) });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`${copy.label}: ${Number(value).toLocaleString("en-US")} days`);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium text-ink">{copy.label}</span>
        <span id={`${id}-help`} className="mt-0.5 block text-body-sm text-ink-2">
          {copy.help} Default {RETENTION_DEFAULTS[entity].toLocaleString("en-US")}.
        </span>
      </label>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <span className="relative">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={copy.min}
            max={copy.max}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={`${id}-help`}
            className="w-28 pr-12 tabular-nums"
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-caption text-ink-3">
            days
          </span>
        </span>
        <Button type="submit" variant="secondary" size="md" disabled={!dirty} loading={pending}>
          Save
        </Button>
      </form>
    </li>
  );
}
