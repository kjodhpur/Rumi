"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  FileSignature,
  History,
  Pencil,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptAllSections,
  acceptSection,
  editSection,
  reopenAgreement,
  signAgreement,
  startAgreement,
} from "@/app/actions/agreements";
import type { AgreementSection, AgreementView } from "@/lib/agreements/load";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function AgreementEditor({ userId, view }: { userId: string; view: AgreementView }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const agreement = view.agreement;
  const nameOf = new Map(view.members.map((m) => [m.id, m.id === userId ? "You" : m.firstName]));
  const others = view.members.filter((m) => m.id !== userId);

  async function run(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
  ) {
    setPending(key);
    const result = await action();
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    if (success) toast.success(success);
    router.refresh();
  }

  const acceptedCount = agreement?.sections.filter((s) => s.accepted).length ?? 0;
  const total = agreement?.sections.length ?? 0;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 pt-2 lg:pt-0">
      <Link
        href={`/groups/${view.groupId}`}
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-body-sm text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden /> {view.groupName}
      </Link>

      <header>
        <h1 className="font-display text-display-md text-ink lg:text-display-lg">
          Roommate agreement
        </h1>
        <p className="mt-1.5 text-body-sm text-ink-2 lg:text-body">
          {view.members.map((m) => (m.id === userId ? "You" : m.firstName)).join(", ")}
          {agreement ? ` · version ${agreement.version}` : ""}
        </p>
      </header>

      {!agreement || agreement.stale ? (
        <section className="flex flex-col items-start gap-4 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
          <FileSignature className="size-6 text-ink-2" strokeWidth={1.75} aria-hidden />
          <div>
            <h2 className="text-title font-semibold text-ink">
              {agreement?.stale ? "Your group changed" : "Start with a draft"}
            </h2>
            <p className="mt-1 text-body-sm text-ink-2">
              {agreement?.stale
                ? "The old agreement was for different people. Start a fresh one for everyone in the group now."
                : "We'll draft quiet hours, chores, guests and more from everyone's answers, plus anything your matches flagged to talk through. Edit anything, then sign together."}
            </p>
          </div>
          <Button
            loading={pending === "start"}
            onClick={() => void run("start", () => startAgreement(view.groupId), "Draft ready")}
          >
            Start the agreement
          </Button>
        </section>
      ) : (
        <>
          <StatusBar
            agreement={agreement}
            acceptedCount={acceptedCount}
            total={total}
            others={others.map((o) => o.firstName)}
            myPending={agreement.sections.filter((s) => !s.acceptedBy.includes(userId)).length}
            accepting={pending === "accept-all"}
            onAcceptAll={() =>
              void run(
                "accept-all",
                () => acceptAllSections(view.groupId),
                "Accepted every section",
              )
            }
          />

          <ol className="flex flex-col gap-3">
            {agreement.sections.map((section) => (
              <SectionCard
                key={section.key}
                groupId={view.groupId}
                section={section}
                userId={userId}
                memberCount={view.members.length}
                nameOf={nameOf}
                locked={agreement.status === "signed"}
                onDone={() => router.refresh()}
              />
            ))}
          </ol>

          {agreement.status === "signed" ? (
            <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:flex-row sm:items-center">
              <div className="flex-1">
                <h2 className="text-body font-semibold text-ink">Signed by everyone</h2>
                <ul className="mt-1 text-body-sm text-ink-2">
                  {agreement.signatures.map((s) => (
                    <li key={s.userId}>
                      {s.typedName} ·{" "}
                      {new Date(s.signedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <a href={`/print/agreement/${view.groupId}`} target="_blank" rel="noopener">
                    <Printer aria-hidden /> Save as PDF
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  loading={pending === "reopen"}
                  onClick={() =>
                    void run(
                      "reopen",
                      () => reopenAgreement(view.groupId),
                      "Reopened. Edit, then sign again.",
                    )
                  }
                >
                  <RotateCcw aria-hidden /> Reopen
                </Button>
              </div>
            </section>
          ) : (
            <SignPanel
              groupId={view.groupId}
              ready={agreement.ready}
              signedByMe={agreement.signatures.some((s) => s.userId === userId)}
              signedCount={agreement.signatures.length}
              memberCount={view.members.length}
              onDone={(allSigned) => {
                toast.success(allSigned ? "Signed by everyone" : "Signed", {
                  description: allSigned
                    ? "Save a PDF copy anytime."
                    : "We'll wait for everyone else.",
                });
                router.refresh();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatusBar({
  agreement,
  acceptedCount,
  total,
  others,
  myPending,
  accepting,
  onAcceptAll,
}: {
  agreement: NonNullable<AgreementView["agreement"]>;
  acceptedCount: number;
  total: number;
  others: string[];
  myPending: number;
  accepting: boolean;
  onAcceptAll: () => void;
}) {
  const share = total ? acceptedCount / total : 0;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-xs ring-1 ring-line sm:p-5">
      <div className="flex items-center justify-between gap-3 text-body-sm">
        <span className="font-medium text-ink">
          {agreement.status === "signed"
            ? "Signed"
            : `${acceptedCount} of ${total} sections agreed`}
        </span>
        {agreement.status === "reopened" ? <Badge variant="warning">Reopened</Badge> : null}
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-success"
          initial={false}
          animate={{ width: `${share * 100}%` }}
          transition={spring}
        />
      </div>
      {agreement.status !== "signed" ? (
        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-ink-3">
            A section is agreed when you and {others.join(" and ")} have each accepted the same
            text.
          </p>
          {myPending > 1 ? (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              loading={accepting}
              onClick={onAcceptAll}
            >
              <Check aria-hidden /> Accept all {myPending}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({
  groupId,
  section,
  userId,
  memberCount,
  nameOf,
  locked,
  onDone,
}: {
  groupId: string;
  section: AgreementSection;
  userId: string;
  memberCount: number;
  nameOf: Map<string, string>;
  locked: boolean;
  onDone: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(section.content);
  const [showPrevious, setShowPrevious] = React.useState(false);
  const [pending, setPending] = React.useState<"save" | "accept" | null>(null);
  React.useEffect(() => setText(section.content), [section.content]);
  const iAccepted = section.acceptedBy.includes(userId);
  const headingId = `section-${section.key}`;

  async function save() {
    setPending("save");
    const result = await editSection({ groupId, key: section.key, content: text });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    setEditing(false);
    onDone();
  }

  async function accept() {
    setPending("accept");
    const result = await acceptSection({ groupId, key: section.key });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    onDone();
  }

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        "rounded-xl bg-surface p-5 shadow-xs ring-1 transition-colors",
        section.accepted ? "ring-line" : "ring-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="text-body font-semibold text-ink">
          {section.title}
        </h2>
        {section.accepted ? (
          <Badge variant="success" size="sm">
            <CircleCheck aria-hidden /> Agreed
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            {section.acceptedBy.length} of {memberCount} accepted
          </Badge>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <Textarea
            aria-labelledby={headingId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={pending === "save"}
              disabled={!text.trim() || text === section.content}
              onClick={() => void save()}
            >
              Save change
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(section.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-caption text-ink-3">
            Saving asks everyone else to accept your version.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-body-sm whitespace-pre-line text-ink-2">{section.content}</p>
      )}

      {section.proposedBy && !editing ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-caption text-ink-3">
          <span>Changed by {nameOf.get(section.proposedBy) ?? "a former member"}</span>
          {section.previous ? (
            <button
              type="button"
              onClick={() => setShowPrevious((s) => !s)}
              aria-expanded={showPrevious}
              className="inline-flex items-center gap-1 rounded-sm font-medium text-ink-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              <History className="size-3.5" strokeWidth={2} aria-hidden />{" "}
              {showPrevious ? "Hide previous" : "See previous"}
            </button>
          ) : null}
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {showPrevious && section.previous ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="mt-2 overflow-hidden rounded-md bg-surface-sunken px-3 py-2 text-caption whitespace-pre-line text-ink-3 line-through decoration-ink-3/50"
          >
            {section.previous}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {!locked && !editing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {iAccepted ? (
            <span className="inline-flex h-8 items-center gap-1.5 text-body-sm font-medium text-success">
              <Check className="size-4" strokeWidth={2.5} aria-hidden /> You accepted
            </span>
          ) : (
            <Button size="sm" loading={pending === "accept"} onClick={() => void accept()}>
              <Check aria-hidden /> Accept
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${section.title}`}
          >
            <Pencil aria-hidden /> Edit
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function SignPanel({
  groupId,
  ready,
  signedByMe,
  signedCount,
  memberCount,
  onDone,
}: {
  groupId: string;
  ready: boolean;
  signedByMe: boolean;
  signedCount: number;
  memberCount: number;
  onDone: (allSigned: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await signAgreement({ groupId, typedName: name });
    setPending(false);
    if (!result.ok) return setError(result.error);
    onDone(result.data.signed);
  }

  return (
    <section
      aria-labelledby="sign-title"
      className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line"
    >
      <h2 id="sign-title" className="text-body font-semibold text-ink">
        Sign
      </h2>
      {!ready ? (
        <p className="mt-1 text-body-sm text-ink-2">
          Signing opens once everyone has accepted every section.
        </p>
      ) : signedByMe ? (
        <p className="mt-1 text-body-sm text-ink-2">
          You signed. Waiting on {memberCount - signedCount} more{" "}
          {memberCount - signedCount === 1 ? "person" : "people"}.
        </p>
      ) : (
        <form
          onSubmit={sign}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          noValidate
        >
          <Field label="Type your full name" error={error} className="flex-1">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                autoComplete="name"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Button type="submit" loading={pending} disabled={name.trim().length < 2}>
            <FileSignature aria-hidden /> Sign agreement
          </Button>
        </form>
      )}
    </section>
  );
}
