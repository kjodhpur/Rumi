"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  MoreHorizontal,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserX,
} from "lucide-react";
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
import {
  escalateReport,
  reviewProfileMedia,
  restoreSchoolStudent,
  suspendSchoolStudent,
  updateSchoolReportStatus,
  warnSchoolStudent,
} from "@/app/actions/safety";
import { REPORT_REASONS, labelOf } from "@/lib/options";
import {
  ESCALATION_CATEGORIES,
  type EscalationCategory,
  type EscalationRoute,
} from "@/lib/safety/escalation";
import type {
  SafetyLogItem,
  SchoolReportFilter,
  SchoolReportStatus,
  StaffEscalationItem,
  StaffReportItem,
  StaffSafetyStats,
  HiddenMediaItem,
} from "@/lib/staff/safety";

export function SafetyCenter({
  schoolId,
  schoolName,
  stats,
  initialReports,
  initialEscalations,
  routes,
  log,
  hiddenMedia,
}: {
  schoolId: string;
  schoolName: string;
  stats: StaffSafetyStats;
  initialReports: StaffReportItem[];
  initialEscalations: StaffEscalationItem[];
  routes: EscalationRoute[];
  log: SafetyLogItem[];
  hiddenMedia: HiddenMediaItem[];
}) {
  const [tab, setTab] = React.useState<"reports" | "escalations" | "media" | "log">("reports");
  const [mediaPending, setMediaPending] = React.useState<string | null>(null);
  const router = useRouter();

  async function reviewMedia(userId: string, decision: "restore" | "remove") {
    setMediaPending(`${userId}-${decision}`);
    const res = await reviewProfileMedia({ schoolId, userId, decision });
    setMediaPending(null);
    if (!res.ok) return void toast.error(res.error);
    toast.success(decision === "restore" ? "Clip restored" : "Clip removed");
    router.refresh();
  }
  const [statusFilter, setStatusFilter] = React.useState<SchoolReportFilter>("open");
  const [reports, setReports] = React.useState(initialReports);
  const [escalations, setEscalations] = React.useState(initialEscalations);

  // Modal states
  const [warnModal, setWarnModal] = React.useState<{ report: StaffReportItem } | null>(null);
  const [warnNote, setWarnNote] = React.useState("");
  const [suspendModal, setSuspendModal] = React.useState<{ report: StaffReportItem } | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [escalateModal, setEscalateModal] = React.useState<{ report: StaffReportItem } | null>(null);
  const [escalateCategory, setEscalateCategory] = React.useState<EscalationCategory>("harassment");
  const [escalateNotes, setEscalateNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const filteredReports = reports.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  async function handleStatusChange(reportId: string, newStatus: SchoolReportStatus) {
    const res = await updateSchoolReportStatus({
      reportId,
      schoolId,
      status: newStatus,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));
    toast.success(`Report marked ${newStatus}`);
  }

  async function handleWarn() {
    if (!warnModal || !warnNote.trim()) return;
    setPending(true);
    const res = await warnSchoolStudent({
      userId: warnModal.report.reported.id,
      schoolId,
      note: warnNote.trim(),
      reportId: warnModal.report.id,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Warning notice sent to student.");
    setWarnModal(null);
    setWarnNote("");
  }

  async function handleSuspend() {
    if (!suspendModal) return;
    setPending(true);
    const res = await suspendSchoolStudent({
      userId: suspendModal.report.reported.id,
      schoolId,
      reason: suspendReason.trim() || "Violation of campus conduct policies",
      reportId: suspendModal.report.id,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.reported.id === suspendModal.report.reported.id
          ? {
              ...r,
              status: "actioned",
              reported: { ...r.reported, bannedAt: new Date().toISOString() },
            }
          : r,
      ),
    );
    toast.success("Student suspended from Rumi.");
    setSuspendModal(null);
    setSuspendReason("");
  }

  async function handleRestore(userId: string) {
    const res = await restoreSchoolStudent({ userId, schoolId });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.reported.id === userId
          ? { ...r, reported: { ...r.reported, bannedAt: null } }
          : r,
      ),
    );
    toast.success("Student access restored.");
  }

  async function handleEscalate() {
    if (!escalateModal) return;
    const activeRoute = routes.find((r) => r.category === escalateCategory && r.active);
    if (!activeRoute) return void toast.error("Set up where this category goes first, in Escalation routes.");
    const destinationLabel = activeRoute.destinationLabel;

    setPending(true);
    const res = await escalateReport({
      reportId: escalateModal.report.id,
      schoolId,
      category: escalateCategory,
      routeId: activeRoute.id,
      destinationLabel,
      notes: escalateNotes.trim() || undefined,
    });
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === escalateModal.report.id
          ? {
              ...r,
              status: "actioned",
              escalation: {
                id: "new",
                category: escalateCategory,
                destination: destinationLabel,
                status: "forwarded",
                forwardedAt: new Date().toISOString(),
              },
            }
          : r,
      ),
    );

    toast.success(`Recorded as handed off to ${destinationLabel}.`);
    setEscalateModal(null);
    setEscalateNotes("");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Safety & moderation"
          description={`Reports about ${schoolName} students from ${schoolName} students. Reports across schools go to the Rumi team.`}
          className="pb-0 lg:pb-0"
        />
        <Button variant="secondary" size="sm" asChild>
          <Link href="/staff/settings/escalation" className="inline-flex items-center gap-1.5">
            <Siren className="h-4 w-4 text-accent" />
            Configure escalation routes
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-caption font-medium text-ink-3">Open reports</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{stats.open}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-caption font-medium text-ink-3">Under review</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{stats.reviewing}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-caption font-medium text-ink-3">Serious reports</p>
          <p className="mt-1 text-2xl font-semibold text-accent">{stats.escalated}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-caption font-medium text-ink-3">Active routes</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {stats.activeRoutesCount} of 5
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex overflow-x-auto border-b border-line" role="tablist" aria-label="Safety sections">
        <button
          role="tab"
          aria-selected={tab === "reports"}
          onClick={() => setTab("reports")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${
            tab === "reports"
              ? "border-accent text-ink"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          Reports Queue ({reports.filter((r) => r.status === "open").length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "escalations"}
          onClick={() => setTab("escalations")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${
            tab === "escalations"
              ? "border-accent text-ink"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          Escalations Log ({escalations.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "media"}
          onClick={() => setTab("media")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${
            tab === "media" ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          Hidden intros ({hiddenMedia.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "log"}
          onClick={() => setTab("log")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${
            tab === "log"
              ? "border-accent text-ink"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          Moderation History
        </button>
      </div>

      {/* Tab: Reports Queue */}
      {tab === "reports" ? (
        <div className="flex flex-col gap-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(["open", "reviewing", "actioned", "dismissed", "all"] as SchoolReportFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-full px-3 py-1 text-caption font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? "bg-ink text-ink-inverse"
                    : "bg-surface border border-line text-ink-2 hover:bg-surface-hover"
                }`}
              >
                {f} ({reports.filter((r) => (f === "all" ? true : r.status === f)).length})
              </button>
            ))}
          </div>

          {filteredReports.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title="No reports in this view"
              description="Everything is clear in this status queue for your campus."
            />
          ) : (
            <div className="grid gap-3.5">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={report.reported.avatarUrl}
                        firstName={report.reported.firstName}
                        lastInitial={report.reported.lastInitial}
                        size={40}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">
                            {report.reported.firstName} {report.reported.lastInitial}.
                          </span>
                          {report.reported.bannedAt ? (
                            <Badge variant="danger" size="sm">Suspended</Badge>
                          ) : null}
                          <Badge size="sm" variant={report.status === "open" ? "warning" : "neutral"}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-caption text-ink-3">
                          Reported by {report.reporter ? `${report.reporter.firstName} ${report.reporter.lastInitial}.` : "Student"} · <RelativeTime iso={report.createdAt} />
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Report actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleStatusChange(report.id, "reviewing")}>
                            Mark reviewing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleStatusChange(report.id, "actioned")}>
                            Mark actioned
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleStatusChange(report.id, "dismissed")}>
                            Dismiss report
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setWarnModal({ report })}>
                            Send warning notice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEscalateModal({ report })}>
                            Escalate to Title IX / CARE
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {report.reported.bannedAt ? (
                            <DropdownMenuItem onClick={() => void handleRestore(report.reported.id)}>
                              Restore student access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-danger"
                              onClick={() => setSuspendModal({ report })}
                            >
                              Suspend student
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Report Reason & Content */}
                  <div className="rounded-lg bg-bg p-3 text-body-sm text-ink border border-line">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" size="sm">
                        {labelOf(REPORT_REASONS, report.reason) || report.reason}
                      </Badge>
                      {report.escalation ? (
                        <span className="inline-flex items-center gap-1 text-caption font-medium text-accent-ink">
                          <Siren className="h-3.5 w-3.5" />
                          Forwarded to {report.escalation.destination}
                        </span>
                      ) : null}
                    </div>

                    {report.details ? (
                      <p className="mt-1 text-ink">{report.details}</p>
                    ) : (
                      <p className="text-caption italic text-ink-3">No additional details provided.</p>
                    )}

                    {report.context?.excerpt ? (
                      <div className="mt-2 border-l-2 border-ink-3 pl-2.5 text-caption text-ink-2">
                        <span className="font-medium text-ink">Reported message:</span> &ldquo;{report.context.excerpt}&rdquo;
                      </div>
                    ) : null}

                    {report.resolutionNote ? (
                      <div className="mt-2 rounded bg-surface p-2 text-caption text-ink-2">
                        <span className="font-semibold text-ink">Resolution note:</span> {report.resolutionNote}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Tab: Escalations Log */}
      {tab === "escalations" ? (
        <div className="flex flex-col gap-4">
          {escalations.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6" />}
              title="No escalations recorded"
              description="No reports have been escalated to Title IX, CARE, or campus emergency contacts yet."
            />
          ) : (
            <div className="grid gap-3.5">
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Siren className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-ink">{esc.destinationLabel}</span>
                      <Badge size="sm" variant={esc.status === "forwarded" ? "success" : "neutral"}>
                        {esc.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-caption text-ink-2">
                      Target: <span className="font-medium text-ink">{esc.reported.name}</span> ·
                      Category: <span className="font-medium text-ink capitalize">{esc.category}</span> ·
                      Student consented: <span className="font-medium text-ink">{esc.studentConsented ? "Yes" : "No"}</span>
                    </p>
                    {esc.notes ? (
                      <p className="mt-1.5 text-caption text-ink-2">Notes: {esc.notes}</p>
                    ) : null}
                  </div>

                  <div className="text-right text-caption text-ink-3 shrink-0">
                    <p>{esc.forwardedByName ? `By ${esc.forwardedByName}` : "Automated routing"}</p>
                    <RelativeTime iso={esc.forwardedAt ?? esc.createdAt} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Tab: Activity Log */}
      {tab === "media" ? (
        hiddenMedia.length === 0 ? (
          <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">No intro clips are waiting for review. Two reports hide a clip until someone here decides.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {hiddenMedia.map((m) => (
              <li key={m.userId} className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
                <p className="text-body-sm font-medium text-ink">{m.name} · {m.reports} reports ({m.reasons.join(", ")})</p>
                {m.signedUrl ? (
                  m.kind === "video" ? <video src={m.signedUrl} controls playsInline className="mt-3 aspect-video w-full max-w-md rounded-md bg-ink" /> : <audio src={m.signedUrl} controls className="mt-3 w-full max-w-md" />
                ) : null}
                <p className="mt-2 text-caption text-ink-2">Transcript: {m.transcript}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" loading={mediaPending === `${m.userId}-restore`} onClick={() => void reviewMedia(m.userId, "restore")}>Restore</Button>
                  <Button size="sm" variant="danger" loading={mediaPending === `${m.userId}-remove`} onClick={() => void reviewMedia(m.userId, "remove")}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "log" ? (
        <div className="flex flex-col gap-3">
          {log.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="No moderation history"
              description="Staff actions for this campus will appear here."
            />
          ) : (
            <div className="divide-y divide-line rounded-xl border border-line bg-surface">
              {log.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-body-sm font-medium text-ink">
                      {item.actorName || "Staff"} — <span className="capitalize">{item.action.replace(/_/g, " ")}</span>
                    </p>
                    {item.targetName ? (
                      <p className="text-caption text-ink-3">Target: {item.targetName}</p>
                    ) : null}
                    {item.note ? (
                      <p className="text-caption text-ink-2 mt-0.5">&ldquo;{item.note}&rdquo;</p>
                    ) : null}
                  </div>
                  <div className="text-caption text-ink-3 shrink-0">
                    <RelativeTime iso={item.createdAt} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Modal: Warn Student */}
      {warnModal ? (
        <Sheet
          open={Boolean(warnModal)}
          onOpenChange={(open) => !open && setWarnModal(null)}
          title={`Warn ${warnModal.report.reported.firstName}`}
          description="Send an official community guidelines notice. This will appear in their notifications."
          footer={
            <Button size="lg" block onClick={() => void handleWarn()} loading={pending}>
              Send warning
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Textarea
              aria-label="Warning message"
              placeholder="Explain the guideline violation clearly and concisely..."
              rows={4}
              value={warnNote}
              onChange={(e) => setWarnNote(e.target.value)}
            />
          </div>
        </Sheet>
      ) : null}

      {/* Modal: Suspend Student */}
      {suspendModal ? (
        <Sheet
          open={Boolean(suspendModal)}
          onOpenChange={(open) => !open && setSuspendModal(null)}
          title={`Suspend ${suspendModal.report.reported.firstName}`}
          description="Suspension revokes login access, hides their profile from all matching, and ends active intros."
          footer={
            <Button variant="danger" size="lg" block onClick={() => void handleSuspend()} loading={pending}>
              Confirm suspension
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Textarea
              aria-label="Suspension reason"
              placeholder="Reason for suspension (visible in audit log)..."
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
        </Sheet>
      ) : null}

      {/* Modal: Escalate to Campus */}
      {escalateModal ? (
        <Sheet
          open={Boolean(escalateModal)}
          onOpenChange={(open) => !open && setEscalateModal(null)}
          title="Hand off to a campus office"
          description="Rumi doesn't contact the office for you. Reach them through their phone or reporting page, then record the hand-off here. Share what the student reported only if they agreed or your documented policy requires it (needs legal review)."
          footer={
            <Button size="lg" block onClick={() => void handleEscalate()} loading={pending} disabled={!routes.some((r) => r.category === escalateCategory && r.active)}>
              Record hand-off
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-caption font-semibold text-ink">Office / Category</label>
              <select
                aria-label="Category for escalation"
                value={escalateCategory}
                onChange={(e) => setEscalateCategory(e.target.value as EscalationCategory)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-body-sm text-ink"
              >
                {ESCALATION_CATEGORIES.map((c) => {
                  const r = routes.find((route) => route.category === c.key && route.active);
                  return (
                    <option key={c.key} value={c.key} disabled={!r}>
                      {c.label} {r ? `(${r.destinationLabel})` : "(not set up)"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-caption font-semibold text-ink">Staff escalation notes</label>
              <Textarea
                aria-label="Escalation notes"
                placeholder="Notes for the campus team or record..."
                rows={3}
                value={escalateNotes}
                onChange={(e) => setEscalateNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
