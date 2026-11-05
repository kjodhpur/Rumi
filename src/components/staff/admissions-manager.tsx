"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  linkAdmitAccount,
  setPreArrivalEnabled,
  uploadAdmitAllowlist,
  withdrawAdmit,
} from "@/app/actions/admissions";
import { decodeCsvBytes } from "@/lib/csv/parse";

export interface AdmissionsStats {
  listed: string;
  signedUp: string;
  withdrawn: string;
}

export function AdmissionsManager({
  schoolId,
  enabled,
  terms,
  stats,
}: {
  schoolId: string;
  enabled: boolean;
  terms: { id: string; name: string }[];
  stats: AdmissionsStats;
}) {
  const router = useRouter();
  const [on, setOn] = React.useState(enabled);
  const [termId, setTermId] = React.useState<string>(terms[0]?.id ?? "");
  const [pending, setPending] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<string | null>(null);
  const [withdrawEmail, setWithdrawEmail] = React.useState("");
  const [link, setLink] = React.useState({ personalEmail: "", schoolEmail: "" });
  const file = React.useRef<HTMLInputElement>(null);

  async function toggle(v: boolean) {
    setOn(v);
    const r = await setPreArrivalEnabled(schoolId, v);
    if (!r.ok) {
      setOn(!v);
      return toast.error(r.error);
    }
    toast.success(v ? "Admitted students can sign up" : "Pre-arrival sign-up is off");
    router.refresh();
  }

  async function upload(f: File) {
    setPending("upload");
    setReport(null);
    const content = decodeCsvBytes(new Uint8Array(await f.arrayBuffer()));
    const r = await uploadAdmitAllowlist({ schoolId, content, termId: termId || null });
    setPending(null);
    if (file.current) file.current.value = "";
    if (!r.ok) return toast.error(r.error);
    const { added, alreadyListed, invalidRows, duplicates } = r.data;
    setReport(
      [
        `${added} added`,
        alreadyListed ? `${alreadyListed} already on the list` : null,
        duplicates ? `${duplicates} repeated in the file` : null,
        invalidRows.length
          ? `skipped row${invalidRows.length === 1 ? "" : "s"} ${invalidRows.join(", ")} (not a personal email or hash)`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    router.refresh();
  }

  async function withdraw() {
    setPending("withdraw");
    const r = await withdrawAdmit({ schoolId, email: withdrawEmail });
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(
      r.data.hadAccount
        ? "Withdrawn. Their profile is hidden from matching."
        : "Withdrawn. That email can't sign up.",
    );
    setWithdrawEmail("");
    router.refresh();
  }

  async function linkAccounts() {
    setPending("link");
    const r = await linkAdmitAccount({ schoolId, ...link });
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(
      "Linked. The student keeps their matches and chats and signs in with the school email.",
    );
    setLink({ personalEmail: "", schoolEmail: "" });
    router.refresh();
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="pa-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pa-title" className="text-body font-semibold text-ink">
              Pre-arrival sign-up
            </h2>
            <p className="mt-1 text-body-sm text-ink-2">
              Admitted students who don&apos;t have a school account yet sign up with the personal
              email on your list. They match only with other incoming students of the same term.
            </p>
          </div>
          <Switch
            checked={on}
            onCheckedChange={(v) => void toggle(v)}
            aria-label="Pre-arrival sign-up"
          />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["On the list", stats.listed],
            ["Signed up", stats.signedUp],
            ["Withdrawn", stats.withdrawn],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-surface-sunken p-3">
              <dt className="text-caption text-ink-3">{label}</dt>
              <dd className="mt-1 text-display-sm text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="up-title"
      >
        <h2 id="up-title" className="text-body font-semibold text-ink">
          Add admitted students
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          A CSV with an <code>email</code> or <code>email_hash</code> column (SHA-256 of the
          lowercased email), or one email per line. Emails are hashed here and never stored. School
          emails are skipped: those students sign in with their school account.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {terms.length ? (
            <Field label="Admit term" className="w-48">
              {({ id }) => (
                <Select id={id} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <input
            ref={file}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            id="allowlist-file"
            aria-label="Admitted-student list (CSV)"
            tabIndex={-1}
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
          <Button loading={pending === "upload"} onClick={() => file.current?.click()}>
            Choose a CSV
          </Button>
        </div>
        {report ? (
          <p
            role="status"
            className="mt-3 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2"
          >
            {report}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="wd-title"
      >
        <h2 id="wd-title" className="text-body font-semibold text-ink">
          Withdraw an admit
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          They can&apos;t sign up with that email, and a pre-arrival profile they already made is
          hidden from matching.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => (e.preventDefault(), void withdraw())}
        >
          <Field label="Personal email" className="min-w-[240px] flex-1">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={withdrawEmail}
                onChange={(e) => setWithdrawEmail(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="secondary"
            loading={pending === "withdraw"}
            disabled={!withdrawEmail.trim()}
          >
            Withdraw
          </Button>
        </form>
      </section>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="ln-title"
      >
        <h2 id="ln-title" className="text-body font-semibold text-ink">
          Link a duplicate account
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          For a student who made a second account once their school email arrived. Their pre-arrival
          account keeps its matches, chats and groups and takes over the school email; the empty
          second account is deleted. Students can also do this themselves in Settings.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => (e.preventDefault(), void linkAccounts())}
        >
          <Field label="Personal email">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={link.personalEmail}
                onChange={(e) => setLink((l) => ({ ...l, personalEmail: e.target.value }))}
                autoComplete="off"
              />
            )}
          </Field>
          <Field label="School email">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={link.schoolEmail}
                onChange={(e) => setLink((l) => ({ ...l, schoolEmail: e.target.value }))}
                autoComplete="off"
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="secondary"
            loading={pending === "link"}
            disabled={!link.personalEmail.trim() || !link.schoolEmail.trim()}
          >
            Link accounts
          </Button>
        </form>
      </section>
    </div>
  );
}
