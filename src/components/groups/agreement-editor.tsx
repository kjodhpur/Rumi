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
  MessageSquare,
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
  addAgreementComment,
  deleteAgreementComment,
  editSection,
  reopenAgreement,
  signAgreement,
  startAgreement,
} from "@/app/actions/agreements";
import type { AgreementSection, AgreementView } from "@/lib/agreements/load";
import { spring } from "@/lib/motion";
import { wordDiff } from "@/lib/agreements/diff";
import { cn } from "@/lib/utils";
import { useIntlLocale, useT } from "@/components/providers/i18n";
import { sectionTitle } from "@/lib/i18n/agreements";

export function AgreementEditor({ userId, view }: { userId: string; view: AgreementView }) {
  const router = useRouter();
  const t = useT("agreement");
  const intl = useIntlLocale();
  const [pending, setPending] = React.useState<string | null>(null);
  const agreement = view.agreement;
  const nameOf = new Map(view.members.map((m) => [m.id, m.id === userId ? t("you") : m.firstName]));
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
        <h1 className="font-display text-display-md text-ink lg:text-display-lg">{t("title")}</h1>
        <p className="mt-1.5 text-body-sm text-ink-2 lg:text-body">
          {view.members.map((m) => (m.id === userId ? t("you") : m.firstName)).join(", ")}
          {agreement ? t("version", { n: agreement.version }) : ""}
        </p>
      </header>

      {!agreement || agreement.stale ? (
        <section className="flex flex-col items-start gap-4 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
          <FileSignature className="size-6 text-ink-2" strokeWidth={1.75} aria-hidden />
          <div>
            <h2 className="text-title font-semibold text-ink">
              {agreement?.stale ? t("staleTitle") : t("startTitle")}
            </h2>
            <p className="mt-1 text-body-sm text-ink-2">
              {agreement?.stale ? t("staleBody") : t("startBody")}
            </p>
          </div>
          <Button
            loading={pending === "start"}
            onClick={() => void run("start", () => startAgreement(view.groupId), t("draftReady"))}
          >
            {t("start")}
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
              void run("accept-all", () => acceptAllSections(view.groupId), t("acceptedAll"))
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
                title={sectionTitle(section.key, section.title, t)}
                locked={agreement.status === "signed"}
                onDone={() => router.refresh()}
              />
            ))}
          </ol>

          {agreement.status === "signed" ? (
            <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:flex-row sm:items-center">
              <div className="flex-1">
                <h2 className="text-body font-semibold text-ink">{t("signedAll")}</h2>
                <ul className="mt-1 text-body-sm text-ink-2">
                  {agreement.signatures.map((s) => (
                    <li key={s.userId}>
                      {s.typedName} ·{" "}
                      {new Date(s.signedAt).toLocaleDateString(intl, {
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
                    <Printer aria-hidden /> {t("savePdf")}
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  loading={pending === "reopen"}
                  onClick={() =>
                    void run("reopen", () => reopenAgreement(view.groupId), t("reopenedToast"))
                  }
                >
                  <RotateCcw aria-hidden /> {t("reopen")}
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
                toast.success(allSigned ? t("signedAll") : t("signed"), {
                  description: allSigned ? t("signedAllHint") : t("signedHint"),
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
  const t = useT("agreement");
  const share = total ? acceptedCount / total : 0;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-xs ring-1 ring-line sm:p-5">
      <div className="flex items-center justify-between gap-3 text-body-sm">
        <span className="font-medium text-ink">
          {agreement.status === "signed"
            ? t("signed")
            : t("sectionsAgreed", { agreed: acceptedCount, total })}
        </span>
        {agreement.status === "reopened" ? <Badge variant="warning">{t("reopened")}</Badge> : null}
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
            {t("agreedWhen", { names: others.join(t("and")) })}
          </p>
          {myPending > 1 ? (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              loading={accepting}
              onClick={onAcceptAll}
            >
              <Check aria-hidden /> {t("acceptAll", { count: myPending })}
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
  title,
  locked,
  onDone,
}: {
  groupId: string;
  section: AgreementSection;
  userId: string;
  memberCount: number;
  nameOf: Map<string, string>;
  /** The section title in the reader's language. */
  title: string;
  locked: boolean;
  onDone: () => void;
}) {
  const t = useT("agreement");
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(section.content);
  // A change waiting on someone's acceptance shows its highlights until they hide it.
  const [showPrevious, setShowPrevious] = React.useState<boolean | null>(null);
  const showChanges = showPrevious ?? (!section.accepted && section.previous !== null);
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
          {title}
        </h2>
        {section.accepted ? (
          <Badge variant="success" size="sm">
            <CircleCheck aria-hidden /> {t("agreed")}
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            {t("acceptedOf", { count: section.acceptedBy.length, total: memberCount })}
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
              {t("saveChange")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setText(section.content);
                setEditing(false);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
          <p className="text-caption text-ink-3">{t("savingAsks")}</p>
        </div>
      ) : (
        <p className="mt-2 text-body-sm whitespace-pre-line text-ink-2">{section.content}</p>
      )}

      {section.proposedBy && !editing ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-caption text-ink-3">
          <span>
            {t("changedBy", { name: nameOf.get(section.proposedBy) ?? t("formerMember") })}
          </span>
          {section.previous ? (
            <button
              type="button"
              onClick={() => setShowPrevious(!showChanges)}
              aria-expanded={showChanges}
              className="inline-flex items-center gap-1 rounded-sm font-medium text-ink-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              <History className="size-3.5" strokeWidth={2} aria-hidden />{" "}
              {showChanges ? t("hideChanges") : t("showChanges")}
            </button>
          ) : null}
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {showChanges && section.previous !== null ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            aria-label={t("whatChanged")}
            className="mt-2 overflow-hidden rounded-md bg-surface-sunken px-3 py-2 text-caption whitespace-pre-line text-ink-2"
          >
            {wordDiff(section.previous, section.content).map((part, i) =>
              part.kind === "same" ? (
                <span key={i}>{part.text}</span>
              ) : part.kind === "added" ? (
                <ins key={i} className="rounded-sm bg-accent-soft px-0.5 text-ink no-underline">
                  <span className="sr-only">{t("added")}</span>
                  {part.text}
                </ins>
              ) : (
                <del key={i} className="text-ink-3 decoration-ink-3/60">
                  <span className="sr-only">{t("removed")}</span>
                  {part.text}
                </del>
              ),
            )}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <SectionComments
        groupId={groupId}
        sectionKey={section.key}
        comments={section.comments}
        userId={userId}
        nameOf={nameOf}
        locked={locked}
        onDone={onDone}
      />

      {!locked && !editing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {iAccepted ? (
            <span className="inline-flex h-8 items-center gap-1.5 text-body-sm font-medium text-success">
              <Check className="size-4" strokeWidth={2.5} aria-hidden /> {t("youAccepted")}
            </span>
          ) : (
            <Button size="sm" loading={pending === "accept"} onClick={() => void accept()}>
              <Check aria-hidden /> {t("accept")}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={t("editAria", { title })}
          >
            <Pencil aria-hidden /> {t("edit")}
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
  const t = useT("agreement");
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
        {t("sign")}
      </h2>
      {!ready ? (
        <p className="mt-1 text-body-sm text-ink-2">{t("signOpens")}</p>
      ) : signedByMe ? (
        <p className="mt-1 text-body-sm text-ink-2">
          {t("waiting", { count: memberCount - signedCount })}
        </p>
      ) : (
        <form
          onSubmit={sign}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          noValidate
        >
          <Field label={t("typeName")} error={error} className="flex-1">
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
            <FileSignature aria-hidden /> {t("signAgreement")}
          </Button>
        </form>
      )}
    </section>
  );
}

function SectionComments({
  groupId,
  sectionKey,
  comments,
  userId,
  nameOf,
  locked,
  onDone,
}: {
  groupId: string;
  sectionKey: string;
  comments: AgreementSection["comments"];
  userId: string;
  nameOf: Map<string, string>;
  locked: boolean;
  onDone: () => void;
}) {
  const t = useT("agreement");
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  if (locked && !comments.length) return null;

  async function post() {
    setPending(true);
    const result = await addAgreementComment({ groupId, key: sectionKey, body });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    setBody("");
    onDone();
  }
  async function remove(id: string) {
    const result = await deleteAgreementComment(groupId, id);
    if (!result.ok) return void toast.error(result.error);
    onDone();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-sm text-caption font-medium text-ink-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
      >
        <MessageSquare className="size-3.5" strokeWidth={2} aria-hidden />
        {comments.length ? t("comments", { count: comments.length }) : t("comment")}
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
          {comments.map((c) => (
            <div key={c.id} className="text-body-sm">
              <p className="text-ink">
                <span className="font-medium">
                  {(c.authorId && nameOf.get(c.authorId)) ?? t("formerMemberStart")}
                </span>{" "}
                <span className="whitespace-pre-line text-ink-2">{c.body}</span>
              </p>
              {c.authorId === userId && !locked ? (
                <button
                  type="button"
                  onClick={() => void remove(c.id)}
                  className="text-caption text-ink-3 underline-offset-4 hover:underline"
                >
                  {t("delete")}
                </button>
              ) : null}
            </div>
          ))}
          {!locked ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => (e.preventDefault(), void post())}
            >
              <Textarea
                aria-label={t("addComment")}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t("commentPlaceholder")}
              />
              <Button
                type="submit"
                size="sm"
                className="self-start"
                loading={pending}
                disabled={!body.trim()}
              >
                {t("post")}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
