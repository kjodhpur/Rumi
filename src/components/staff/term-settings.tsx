"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveTerm } from "@/app/actions/staff-dashboard";
import { DEADLINE_LABELS, type Term } from "@/lib/staff/terms";

type Form = {
  name: string;
  startsOn: string;
  endsOn: string;
  roommateRequest: string;
  selectionOpens: string;
  selectionCloses: string;
};

export function TermSettings({ schoolId, term }: { schoolId: string; term: Term | null }) {
  const router = useRouter();
  const [form, setForm] = React.useState<Form>({
    name: term?.name ?? "",
    startsOn: term?.startsOn ?? "",
    endsOn: term?.endsOn ?? "",
    roommateRequest: term?.deadlines.roommateRequest ?? "",
    selectionOpens: term?.deadlines.selectionOpens ?? "",
    selectionCloses: term?.deadlines.selectionCloses ?? "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError(null);
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await saveTerm({ schoolId, ...form });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setSaved(true);
    toast.success(term ? "Term updated" : "Term created");
    router.refresh();
  }

  const date = (key: keyof Form, label: string, hint?: string, required = false) => (
    <Field label={label} hint={hint}>
      {({ id, describedBy }) => (
        <Input id={id} type="date" value={form[key]} onChange={set(key)} aria-describedby={describedBy} required={required} />
      )}
    </Field>
  );

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">
      <PageHeader
        title="Term"
        description="The housing term students are matching for. Its deadlines appear on the overview."
        className="pb-0 lg:pb-0"
      />
      <form onSubmit={submit} className="flex flex-col gap-6 rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" noValidate>
        <Field label="Name" hint="For example, Fall 2027.">
          {({ id, describedBy }) => (
            <Input id={id} value={form.name} onChange={set("name")} maxLength={60} aria-describedby={describedBy} required autoComplete="off" />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {date("startsOn", "Starts", undefined, true)}
          {date("endsOn", "Ends", undefined, true)}
        </div>
        <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
          <legend className="text-body-sm font-semibold text-ink">Key dates</legend>
          <p className="-mt-2 text-caption text-ink-3">Optional. Leave any date blank if it doesn&apos;t apply.</p>
          {date("roommateRequest", DEADLINE_LABELS.roommateRequest, "The last day students can submit a roommate request.")}
          <div className="grid gap-4 sm:grid-cols-2">
            {date("selectionOpens", DEADLINE_LABELS.selectionOpens)}
            {date("selectionCloses", DEADLINE_LABELS.selectionCloses)}
          </div>
        </fieldset>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-body-sm text-danger">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" loading={pending} success={saved}>
            {term ? "Save changes" : "Create term"}
          </Button>
        </div>
      </form>
    </div>
  );
}
