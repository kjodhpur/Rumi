"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteStudentOnRequest, lookupDataRequestStudent } from "@/app/actions/staff";

/**
 * Records requests (0.2): export a student's records with their sharing consent or a written
 * legal basis, or delete an account on request. Both are recorded in the audit log.
 */
export function DataRequests({ schoolId }: { schoolId: string }) {
  const [email, setEmail] = React.useState("");
  const [found, setFound] = React.useState<{ name: string; consented: boolean } | null>(null);
  const [basis, setBasis] = React.useState<"consent" | "legal">("consent");
  const [reason, setReason] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);

  async function lookup() {
    setPending("lookup");
    setFound(null);
    const r = await lookupDataRequestStudent({ schoolId, email });
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    setFound(r.data);
    setBasis(r.data.consented ? "consent" : "legal");
  }

  async function exportRecords() {
    setPending("export");
    const body = new FormData();
    body.set("email", email);
    body.set("basis", basis);
    body.set("reason", reason);
    const res = await fetch("/api/staff/data-request", { method: "POST", body });
    setPending(null);
    if (!res.ok)
      return toast.error(
        ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't export.",
      );
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `rumi-student-record-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded and recorded in the audit log");
  }

  async function remove() {
    setPending("delete");
    const r = await deleteStudentOnRequest({ schoolId, email, reason, confirmation: confirm });
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    toast.success("Account deleted. The request is in the audit log.");
    setFound(null);
    setEmail("");
    setReason("");
    setConfirm("");
  }

  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="dsr-title"
    >
      <h2 id="dsr-title" className="text-body font-semibold text-ink">
        Records requests
      </h2>
      <p className="mt-1 text-body-sm text-ink-2">
        Export a student&apos;s Rumi records, or delete their account when they ask. Exports need
        the student&apos;s choice to share with your office, or a written legal basis. Students can
        always download their own data in Settings.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => (e.preventDefault(), void lookup())}
      >
        <Field label="Student's email" className="min-w-[240px] flex-1">
          {({ id }) => (
            <Input
              id={id}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => (setEmail(e.target.value), setFound(null))}
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="secondary"
          loading={pending === "lookup"}
          disabled={!email.trim()}
        >
          Find student
        </Button>
      </form>

      {found ? (
        <div className="mt-5 flex flex-col gap-4 rounded-lg bg-surface-sunken p-4">
          <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink">
            <span className="font-medium">{found.name}</span>
            <Badge size="sm" variant={found.consented ? "success" : "neutral"}>
              {found.consented ? "Shares with your office" : "Doesn't share with your office"}
            </Badge>
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-body-sm font-medium text-ink">Basis for an export</legend>
            <label className="flex items-center gap-2 text-body-sm text-ink">
              <input
                type="radio"
                name="basis"
                value="consent"
                checked={basis === "consent"}
                disabled={!found.consented}
                onChange={() => setBasis("consent")}
              />{" "}
              The student shares with us
            </label>
            <label className="flex items-center gap-2 text-body-sm text-ink">
              <input
                type="radio"
                name="basis"
                value="legal"
                checked={basis === "legal"}
                onChange={() => setBasis("legal")}
              />{" "}
              A legal basis (written below)
            </label>
          </fieldset>
          <Field
            label="Request or legal basis"
            hint="Required for a legal-basis export and for a deletion. Saved in the audit log."
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button loading={pending === "export"} onClick={() => void exportRecords()}>
              Export records
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <Field label="Type DELETE to delete this account" className="w-56">
              {({ id }) => (
                <Input
                  id={id}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                />
              )}
            </Field>
            <Button
              variant="danger"
              loading={pending === "delete"}
              disabled={confirm.trim().toUpperCase() !== "DELETE"}
              onClick={() => void remove()}
            >
              Delete account
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
