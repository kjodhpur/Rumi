"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Accessibility, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/ui/choice";
import { removeAccommodation, setAccommodation } from "@/app/actions/accommodations";

export interface AccommodationStudent {
  id: string;
  name: string;
  classYear: string | null;
  shares: boolean;
  constraints: { key: string; expiresOn: string | null; note: string | null; legalHold: boolean }[];
}

export function AccommodationsManager({
  schoolId,
  query,
  types,
  students,
}: {
  schoolId: string;
  query: string;
  types: { key: string; label: string }[];
  students: AccommodationStudent[];
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(query);
  const [adding, setAdding] = React.useState<AccommodationStudent | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const label = (key: string) => types.find((t) => t.key === key)?.label ?? key;

  async function remove(student: AccommodationStudent, key: string) {
    setPending(`${student.id}-${key}`);
    const result = await removeAccommodation(schoolId, student.id, key);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Removed. Their matches update shortly.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accommodations"
        description="Approved accommodations become hard constraints in matching and auto-pair. Other students never see them; matches that don't fit simply don't appear. Only students who share with your office are listed."
        className="pb-0 lg:pb-0"
      />
      <form
        role="search"
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/staff/accommodations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student by first name" aria-label="Find a student" />
        <Button type="submit" variant="secondary" size="icon" aria-label="Search">
          <Search aria-hidden />
        </Button>
      </form>

      {students.length === 0 ? (
        <EmptyState
          icon={<Accessibility strokeWidth={1.75} />}
          title={query ? "No sharing students by that name" : "No accommodations recorded"}
          description={query ? "Students appear here only if they chose to share their Rumi results with your office." : "Search for a student to add an approved accommodation."}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
          {students.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{s.name}</p>
                <p className="text-caption text-ink-3">{s.classYear ?? "Year not set"}{s.shares ? "" : " · stopped sharing (kept for legal hold)"}</p>
                {s.constraints.length ? (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {s.constraints.map((c) => (
                      <li key={c.key} className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
                        <Badge variant="accent">{label(c.key)}</Badge>
                        {c.expiresOn ? <span>until {c.expiresOn}</span> : <span>no end date</span>}
                        {c.legalHold ? <Badge variant="warning">Legal hold</Badge> : null}
                        {c.note ? <span className="text-ink-3">· {c.note}</span> : null}
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label(c.key)} for ${s.name}`} loading={pending === `${s.id}-${c.key}`} onClick={() => void remove(s, c.key)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {s.shares ? (
                <Button variant="secondary" size="sm" onClick={() => setAdding(s)}>
                  <Plus aria-hidden /> Add
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AddSheet schoolId={schoolId} student={adding} types={types} onClose={() => setAdding(null)} onDone={() => router.refresh()} />
    </div>
  );
}

function AddSheet({ schoolId, student, types, onClose, onDone }: { schoolId: string; student: AccommodationStudent | null; types: { key: string; label: string }[]; onClose: () => void; onDone: () => void }) {
  const [key, setKey] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [note, setNote] = React.useState("");
  const [legalHold, setLegalHold] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (student) {
      setKey(types.find((t) => !student.constraints.some((c) => c.key === t.key))?.key ?? "");
      setExpiresOn("");
      setNote("");
      setLegalHold(false);
      setError(null);
    }
  }, [student, types]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    setPending(true);
    const result = await setAccommodation({ schoolId, userId: student.id, key, expiresOn, note, legalHold });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success("Saved. Their matches update shortly.");
    onClose();
    onDone();
  }

  return (
    <Sheet
      open={Boolean(student)}
      onOpenChange={(o) => !o && onClose()}
      title={student ? `Accommodation for ${student.name}` : "Accommodation"}
      description="Record only accommodations your office has approved."
      footer={<Button type="submit" form="accommodation-form" block loading={pending}>Save</Button>}
    >
      <form id="accommodation-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Accommodation" error={error}>
          {({ id }) => <ChoiceChips aria-labelledby={id} value={key} onValueChange={setKey} options={types.map((t) => ({ value: t.key, label: t.label }))} />}
        </Field>
        <Field label="Ends on" hint="Optional. It stops applying the next time matches are recomputed after this date.">
          {({ id }) => <Input id={id} type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />}
        </Field>
        <Field label="Internal note" hint="Optional. Encrypted; visible only on this page.">
          {({ id }) => <Textarea id={id} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
          <span>
            Keep if the student stops sharing
            <span className="block text-caption text-ink-3">Only where your school&apos;s policy requires it. Needs legal review.</span>
          </span>
          <Switch checked={legalHold} onCheckedChange={setLegalHold} aria-label="Keep under legal hold" />
        </label>
      </form>
    </Sheet>
  );
}
