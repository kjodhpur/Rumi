"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { Activity, BadgeX, Eye, Inbox, MoreHorizontal, NotebookPen, Search, ShieldCheck, Undo2, UserRoundX, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { revokeVerification, setBan, updateReportStatus } from "@/app/actions/admin";
import { REPORT_REASONS, labelOf } from "@/lib/options";
import { spring, springSnappy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AdminLogEntry, AdminPerson, AdminReport, AdminStats, ReportFilter, ReportStatus } from "@/lib/admin";

export type AdminTab = "reports" | "people" | "log";

interface Props {
  tab: AdminTab;
  stats: AdminStats;
  reportFilter: ReportFilter;
  reports: AdminReport[];
  peopleFilter: "recent" | "banned";
  query: string;
  people: AdminPerson[];
  log: AdminLogEntry[];
}

const TABS: { value: AdminTab; label: string; href: string }[] = [
  { value: "reports", label: "Reports", href: "/admin" },
  { value: "people", label: "People", href: "/admin?tab=people" },
  { value: "log", label: "Activity", href: "/admin?tab=log" },
];

export function AdminDashboard(props: Props) {
  const { tab, stats } = props;
  const [suspend, setSuspend] = React.useState<{ person: AdminPerson; reportId?: string; reason?: string } | null>(null);
  const [restore, setRestore] = React.useState<AdminPerson | null>(null);

  const actions: PersonActions = {
    suspend: (person, report) =>
      setSuspend({ person, reportId: report?.id, reason: report ? labelOf(REPORT_REASONS, report.reason) : undefined }),
    restore: setRestore,
    revoke: async (person) => {
      const result = await revokeVerification(person.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Verification revoked for ${person.firstName}`, {
        description: "They'll need to sign in with their school email again.",
      });
    },
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Safety" description="Reports, accounts and every moderation action in one place." className="pb-0 lg:pb-0" />

      <ul className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6" aria-label="Overview">
        <StatTile label="Open reports" value={stats.open} href="/admin?status=open" alert={stats.open > 0} />
        <StatTile label="In review" value={stats.reviewing} href="/admin?status=reviewing" />
        <StatTile label="Auto-flags (7d)" value={stats.autoThisWeek} href="/admin?status=all" />
        <StatTile label="Suspended" value={stats.banned} href="/admin?tab=people&filter=banned" />
        <StatTile label="Active" value={stats.active} href="/admin?tab=people" />
        <StatTile label="Joined (7d)" value={stats.newThisWeek} href="/admin?tab=people" />
      </ul>

      <TabBar tab={tab} />

      {tab === "reports" ? <ReportsPanel {...props} actions={actions} /> : null}
      {tab === "people" ? <PeoplePanel {...props} actions={actions} /> : null}
      {tab === "log" ? <LogPanel log={props.log} /> : null}

      <SuspendSheet state={suspend} onClose={() => setSuspend(null)} />
      <RestoreSheet person={restore} onClose={() => setRestore(null)} />
    </div>
  );
}

interface PersonActions {
  suspend: (person: AdminPerson, report?: AdminReport) => void;
  restore: (person: AdminPerson) => void;
  revoke: (person: AdminPerson) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────

function StatTile({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="flex h-full flex-col justify-between gap-1.5 rounded-lg bg-surface p-3 shadow-xs ring-1 ring-line outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus sm:gap-2 sm:p-4"
      >
        <span className="flex items-center gap-1.5 text-caption text-ink-3">
          {alert ? <span className="size-1.5 shrink-0 rounded-full bg-danger" aria-hidden /> : null}
          {label}
        </span>
        <span className="text-title font-semibold text-ink tabular-nums sm:text-display-sm">{value.toLocaleString("en-US")}</span>
      </Link>
    </li>
  );
}

function TabBar({ tab }: { tab: AdminTab }) {
  return (
    <nav aria-label="Admin sections" className="-mb-2 border-b border-line">
      <LayoutGroup id="admin-tabs">
        <ul className="flex gap-6">
          {TABS.map((item) => {
            const active = item.value === tab;
            return (
              <li key={item.value}>
                <Link
                  href={item.href}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 items-center text-body-sm font-medium outline-none transition-colors focus-visible:text-ink",
                    active ? "text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {item.label}
                  {active ? (
                    <motion.span layoutId="admin-tab" transition={springSnappy} className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

function FilterPills<T extends string>({ items, value, hrefFor }: { items: { value: T; label: string; count?: number }[]; value: T; hrefFor: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2" role="list">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Link
            key={item.value}
            role="listitem"
            href={hrefFor(item.value)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-body-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
              active ? "bg-ink text-ink-inverse" : "bg-surface text-ink-2 ring-1 ring-line ring-inset hover:bg-surface-hover",
            )}
          >
            {item.label}
            {item.count ? <span className={cn("tabular-nums", active ? "text-ink-inverse/70" : "text-ink-3")}>{item.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

const FLAG_LABELS: Record<string, string> = {
  payment: "Payment request",
  contact: "Off-platform contact",
  abuse: "Abusive language",
  links: "Unknown link",
};

/** Auto reports store their flags as "Automatic flag: payment, contact". */
function autoFlags(details: string | null) {
  return (details ?? "").replace(/^Automatic flag:\s*/i, "").split(/,\s*/).filter(Boolean);
}

const STATUS_LABEL: Record<ReportStatus, string> = { open: "Open", reviewing: "In review", actioned: "Resolved", dismissed: "Dismissed" };
const STATUS_VARIANT: Record<ReportStatus, "danger" | "warning" | "success" | "neutral"> = {
  open: "danger",
  reviewing: "warning",
  actioned: "success",
  dismissed: "neutral",
};

function ReportsPanel({ reports, reportFilter, stats, actions }: Props & { actions: PersonActions }) {
  return (
    <section className="flex flex-col gap-4" aria-label="Reports">
      <FilterPills
        value={reportFilter}
        hrefFor={(v) => (v === "open" ? "/admin" : `/admin?status=${v}`)}
        items={[
          { value: "open", label: "Open", count: stats.open },
          { value: "reviewing", label: "In review", count: stats.reviewing },
          { value: "resolved", label: "Resolved" },
          { value: "all", label: "All" },
        ]}
      />
      {reports.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={reportFilter === "open" ? "The queue is clear" : "Nothing here"}
          description={
            reportFilter === "open"
              ? "New reports from students and automatic flags land here first."
              : "No reports match this filter."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {reports.map((report) => (
              <motion.li
                key={report.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                transition={spring}
              >
                <ReportCard report={report} actions={actions} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function ReportCard({ report, actions }: { report: AdminReport; actions: PersonActions }) {
  const [status, setStatus] = React.useState(report.status);
  const [pending, setPending] = React.useState<ReportStatus | null>(null);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const person = report.reported;
  const resolved = status === "actioned" || status === "dismissed";

  React.useEffect(() => setStatus(report.status), [report.status]);

  async function move(next: ReportStatus) {
    setPending(next);
    const previous = status;
    setStatus(next);
    const result = await updateReportStatus({ reportId: report.id, status: next, note: note.trim() || undefined });
    setPending(null);
    if (!result.ok) {
      setStatus(previous);
      toast.error(result.error);
      return;
    }
    setNote("");
    setNoteOpen(false);
    const messages: Record<ReportStatus, string> = {
      open: "Report reopened",
      reviewing: "Marked as in review",
      actioned: "Report resolved",
      dismissed: "Report dismissed",
    };
    toast.success(messages[next]);
  }

  return (
    <article className="overflow-hidden rounded-lg bg-surface shadow-xs ring-1 ring-line">
      <header className="flex items-start gap-3 p-4 pb-3">
        <Avatar src={person.avatarUrl} firstName={person.firstName} lastInitial={person.lastInitial} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/profile/${person.id}`} className="text-body-sm font-semibold text-ink hover:underline">
              {person.firstName} {person.lastInitial ? `${person.lastInitial}.` : ""}
            </Link>
            <PersonBadges person={person} />
          </div>
          <p className="truncate text-caption text-ink-3">{person.email ?? "No email on file"}</p>
        </div>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-3">
          <span className="font-medium text-ink">{labelOf(REPORT_REASONS, report.reason) || report.reason}</span>
          <span aria-hidden>·</span>
          <span>{report.source === "auto" ? "Automatic flag" : `Reported by ${report.reporter?.name ?? "a deleted account"}`}</span>
          <span aria-hidden>·</span>
          <RelativeTime iso={report.createdAt} />
          {person.reportCount > 1 ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-danger">{person.reportCount} reports in total</span>
            </>
          ) : null}
        </div>
        {report.source === "auto" ? (
          <div className="flex flex-wrap gap-1.5">
            {autoFlags(report.details).map((flag) => (
              <Badge key={flag} variant="warning" size="sm">
                {FLAG_LABELS[flag] ?? flag}
              </Badge>
            ))}
          </div>
        ) : report.details ? (
          <p className="text-body-sm whitespace-pre-line text-ink">{report.details}</p>
        ) : null}
        {report.excerpt ? (
          <figure className="rounded-md bg-surface-sunken px-3.5 py-2.5">
            <figcaption className="text-micro font-semibold tracking-wide text-ink-3 uppercase">Message</figcaption>
            <blockquote className="mt-1 text-body-sm text-ink-2">“{report.excerpt}”</blockquote>
          </figure>
        ) : null}
        {resolved && report.reviewedAt ? (
          <p className="text-caption text-ink-3">
            {STATUS_LABEL[status]} by {report.reviewerName ?? "an admin"} · <RelativeTime iso={report.reviewedAt} />
            {report.resolutionNote ? <span className="text-ink-2"> — “{report.resolutionNote}”</span> : null}
          </p>
        ) : null}
        {noteOpen ? (
          <Textarea
            autoFocus
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the log (optional) — saved with your next action"
            aria-label="Moderator note"
          />
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunken/40 px-4 py-3">
        {status === "open" ? (
          <Button size="sm" variant="secondary" onClick={() => void move("reviewing")} loading={pending === "reviewing"}>
            Start review
          </Button>
        ) : null}
        {status === "reviewing" ? (
          <Button size="sm" variant="primary" onClick={() => void move("actioned")} loading={pending === "actioned"}>
            Resolve
          </Button>
        ) : null}
        {!resolved ? (
          <Button size="sm" variant="ghost" onClick={() => void move("dismissed")} loading={pending === "dismissed"}>
            Dismiss
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => void move("open")} loading={pending === "open"}>
            <Undo2 strokeWidth={1.75} aria-hidden /> Reopen
          </Button>
        )}
        {!person.bannedAt && !resolved ? (
          <Button size="sm" variant="danger-ghost" className="hidden sm:inline-flex" onClick={() => actions.suspend(person, report)}>
            Suspend…
          </Button>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          {!resolved ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={noteOpen ? "Hide note" : "Add a note"}
              aria-pressed={noteOpen}
              onClick={() => setNoteOpen((v) => !v)}
            >
              <NotebookPen strokeWidth={1.75} />
            </Button>
          ) : null}
          <PersonMenu person={person} actions={actions} report={report} />
        </span>
      </footer>
    </article>
  );
}

function PersonBadges({ person }: { person: AdminPerson }) {
  return (
    <>
      {person.bannedAt ? <Badge variant="danger" size="sm">Suspended</Badge> : null}
      {!person.verified ? <Badge variant="warning" size="sm">Unverified</Badge> : null}
      {person.isHidden ? <Badge variant="outline" size="sm">Hidden</Badge> : null}
      {!person.onboarded ? <Badge variant="outline" size="sm">Onboarding</Badge> : null}
      {person.isSeed ? <Badge variant="neutral" size="sm">Demo</Badge> : null}
    </>
  );
}

function PersonMenu({ person, actions, report }: { person: AdminPerson; actions: PersonActions; report?: AdminReport }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${person.firstName}`}>
          <MoreHorizontal strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[232px]">
        <DropdownMenuItem asChild>
          <Link href={`/profile/${person.id}`}>
            <Eye /> View profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin?tab=people&q=${person.id}`}>
            <Users /> Account details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!person.verified} onSelect={() => void actions.revoke(person)}>
          <BadgeX /> Revoke verification
        </DropdownMenuItem>
        {person.bannedAt ? (
          <DropdownMenuItem onSelect={() => actions.restore(person)}>
            <ShieldCheck /> Restore account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem destructive onSelect={() => actions.suspend(person, report)}>
            <UserRoundX /> Suspend account…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────────────────────

function PeoplePanel({ people, query, peopleFilter, actions }: Props & { actions: PersonActions }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = React.useState(query);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const term = value.trim();
    if (term === query) return;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ tab: "people" });
      if (term) params.set("q", term);
      else if (peopleFilter === "banned") params.set("filter", "banned");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [value, query, peopleFilter, pathname, router]);

  return (
    <section className="flex flex-col gap-4" aria-label="People">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by name, email or user id"
          aria-label="Search people"
          leading={<Search strokeWidth={1.75} />}
          className="sm:max-w-[420px] sm:flex-1"
        />
        {!query ? (
          <FilterPills
            value={peopleFilter}
            hrefFor={(v) => (v === "banned" ? "/admin?tab=people&filter=banned" : "/admin?tab=people")}
            items={[
              { value: "recent", label: "Newest" },
              { value: "banned", label: "Suspended" },
            ]}
          />
        ) : null}
      </div>

      {people.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title={query ? "No one by that name" : peopleFilter === "banned" ? "No suspended accounts" : "No accounts yet"}
          description={query ? "Try part of their email, or paste their user id." : undefined}
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-xs ring-1 ring-line transition-opacity duration-150",
            isPending && "opacity-60",
          )}
        >
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={person.avatarUrl} firstName={person.firstName} lastInitial={person.lastInitial} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body-sm font-semibold text-ink">
                    {person.firstName} {person.lastInitial ? `${person.lastInitial}.` : ""}
                  </span>
                  <PersonBadges person={person} />
                </div>
                <p className="truncate text-caption text-ink-3">
                  {person.email ?? "No email"} · Joined{" "}
                  {new Date(person.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {person.reportCount ? (
                    <span className="text-danger"> · {person.reportCount} {person.reportCount === 1 ? "report" : "reports"}</span>
                  ) : null}
                </p>
                {person.bannedAt && person.banReason ? (
                  <p className="mt-1 text-caption text-ink-2">Suspended: “{person.banReason}”</p>
                ) : null}
              </div>
              <PersonMenu person={person} actions={actions} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────────────────────

function LogPanel({ log }: { log: AdminLogEntry[] }) {
  if (log.length === 0) {
    return <EmptyState icon={<Activity />} title="No activity yet" description="Every review, suspension and restore is recorded here." />;
  }
  return (
    <section aria-label="Moderation activity">
      <ol className="overflow-hidden rounded-lg bg-surface shadow-xs ring-1 ring-line">
        {log.map((entry) => (
          <li key={entry.id} className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                entry.action === "Suspended" ? "bg-danger" : entry.action === "Restored" ? "bg-success" : "bg-line-strong",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-ink-2">
                <span className="font-medium text-ink">{entry.actorName ?? "System"}</span> {entry.action.toLowerCase()}{" "}
                {entry.target ? (
                  <Link href={`/admin?tab=people&q=${entry.target.id}`} className="font-medium text-ink hover:underline">
                    {entry.target.name}
                  </Link>
                ) : (
                  "a deleted account"
                )}
              </p>
              {entry.note ? <p className="mt-0.5 text-caption text-ink-2">“{entry.note}”</p> : null}
              <RelativeTime iso={entry.createdAt} className="mt-0.5 block text-caption text-ink-3" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheets
// ─────────────────────────────────────────────────────────────────────────────

function SuspendSheet({
  state,
  onClose,
}: {
  state: { person: AdminPerson; reportId?: string; reason?: string } | null;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [last, setLast] = React.useState(state);
  if (state && state !== last) {
    setLast(state);
    setReason(state.reason ?? "");
  }
  const person = (state ?? last)?.person;

  async function confirm() {
    if (!state) return;
    if (reason.trim().length < 3) {
      toast.error("Add a short reason — the student sees it.");
      return;
    }
    setPending(true);
    const result = await setBan({ userId: state.person.id, banned: true, reason: reason.trim(), reportId: state.reportId });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`${state.person.firstName}'s account is suspended`, {
      description: state.reportId ? "The report was marked resolved." : undefined,
    });
    onClose();
  }

  return (
    <Sheet
      open={Boolean(state)}
      onOpenChange={(open) => (open ? null : onClose())}
      size="sm"
      title={`Suspend ${person?.firstName ?? ""}?`}
      description="Their profile disappears from every list, chats are paused and they're signed out. You can restore the account later."
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" className="flex-1" onClick={() => void confirm()} loading={pending}>
            Suspend
          </Button>
        </div>
      }
    >
      <label className="flex flex-col gap-2">
        <span className="text-body-sm font-medium text-ink">Reason</span>
        <Textarea
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Asked several students for a deposit over Zelle"
        />
        <span className="text-caption text-ink-3">Shown to them on the suspension screen, and saved in the activity log.</span>
      </label>
    </Sheet>
  );
}

function RestoreSheet({ person, onClose }: { person: AdminPerson | null; onClose: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [last, setLast] = React.useState(person);
  if (person && person !== last) setLast(person);
  const shown = person ?? last;

  async function confirm() {
    if (!person) return;
    setPending(true);
    const result = await setBan({ userId: person.id, banned: false });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`${person.firstName}'s account is restored`);
    onClose();
  }

  return (
    <Sheet
      open={Boolean(person)}
      onOpenChange={(open) => (open ? null : onClose())}
      size="sm"
      title={`Restore ${shown?.firstName ?? ""}'s account?`}
      description="They can sign in again and will reappear in matches once scores refresh."
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={() => void confirm()} loading={pending}>
            Restore
          </Button>
        </div>
      }
    >
      {shown?.banReason ? <p className="text-body-sm text-ink-2">Suspended for: “{shown.banReason}”</p> : null}
    </Sheet>
  );
}
