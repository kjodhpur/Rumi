import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, Circle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { RelativeTime } from "@/components/ui/relative-time";
import { BarList, ColumnChart } from "@/components/staff/charts";
import { ScoreSegments } from "@/components/staff/score-segments";
import { ROLE_INFO, type StaffRole } from "@/lib/staff/roles";
import { AUDIT_LABELS, type AuditRow } from "@/lib/staff/team";
import {
  BIN_LABELS,
  FUNNEL_LABELS,
  SCORE_BINS,
  count,
  days,
  isSuppressed,
  share,
  type Overview,
} from "@/lib/staff/metrics";
import { SOURCE_LABEL, type AttributionSource } from "@/lib/integrations/attribution";
import { cn } from "@/lib/utils";

interface Props {
  firstName: string;
  schoolName: string;
  office: string | null;
  showSetup: boolean;
  checklist: { team: boolean; retention: boolean; term: boolean };
  term: { name: string; deadline: { label: string; date: string; daysLeft: number } | null } | null;
  overview: Overview | null;
  weeks: number;
  canSeeStudents: boolean;
  members: { id: string; name: string; role: StaffRole }[];
  recent: AuditRow[];
  /** Phase 9: a running or upcoming pilot, for the countdown. */
  pilot?: { startsOn: string; endsOn: string; scope: string } | null;
}

const WEEK_OPTIONS = [8, 16, 52];

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function StaffHome(props: Props) {
  const {
    firstName,
    schoolName,
    office,
    showSetup,
    checklist,
    term,
    overview,
    weeks,
    members,
    recent,
  } = props;
  const steps = [
    {
      done: checklist.team,
      title: "Invite your team",
      body: "Add housing staff, RAs and analysts. Each role sees only what it needs.",
      href: "/staff/settings/team",
      cta: "Manage team",
    },
    {
      done: checklist.term,
      title: "Set up your first term",
      body: "Name the term and add its roommate and room-selection deadlines.",
      href: "/staff/settings/term",
      cta: "Set up term",
    },
    {
      done: checklist.retention,
      title: "Review privacy and retention",
      body: "Decide how long messages, inactive accounts and audit records are kept. The defaults are sensible.",
      href: "/staff/settings/privacy",
      cta: "Review",
    },
    {
      done: Boolean(office),
      waiting: !office,
      title: "Student sharing",
      body: office
        ? `Students can choose to share their own results with ${office}.`
        : "Students can share their results with your office once your pilot agreement is signed. The Rumi team turns it on.",
    },
  ];
  const remaining = steps.filter((s) => !s.done).length;
  const pilot = props.pilot;
  const today = new Date().toISOString().slice(0, 10);
  const daysTo = (iso: string) =>
    Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Hi, ${firstName}`}
        description={
          term ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {schoolName} · {term.name}
              </span>
              {term.deadline ? (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <CalendarClock className="size-4 text-ink-3" strokeWidth={1.75} aria-hidden />
                  {term.deadline.label}{" "}
                  {term.deadline.daysLeft === 0 ? "is today" : `in ${term.deadline.daysLeft} days`}{" "}
                  ({shortDate(term.deadline.date)})
                </span>
              ) : null}
            </span>
          ) : (
            `${schoolName} housing on Rumi.`
          )
        }
        actions={
          overview ? (
            <Button asChild variant="secondary" size="sm">
              <a href="/print/term-report" target="_blank" rel="noopener">
                <FileText aria-hidden /> Term report
              </a>
            </Button>
          ) : undefined
        }
        className="pb-0 lg:pb-0"
      />

      {pilot ? (
        <section
          aria-label="Pilot"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-accent-soft px-5 py-4 ring-1 ring-line"
        >
          <span className="text-body-sm font-semibold text-ink">
            {today < pilot.startsOn
              ? `Pilot starts in ${daysTo(pilot.startsOn)} ${daysTo(pilot.startsOn) === 1 ? "day" : "days"}`
              : daysTo(pilot.endsOn) <= 0
                ? "The pilot ends today"
                : `${daysTo(pilot.endsOn)} ${daysTo(pilot.endsOn) === 1 ? "day" : "days"} left in the pilot`}
          </span>
          <span className="text-body-sm text-ink-2">
            {shortDate(pilot.startsOn)} to {shortDate(pilot.endsOn)} · {pilot.scope}
          </span>
          <Link
            href="/staff/settings/plan"
            className="ml-auto text-body-sm font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            Pilot settings
          </Link>
        </section>
      ) : null}

      {showSetup && remaining > 0 ? (
        <section
          aria-labelledby="setup-title"
          className="rounded-xl bg-surface shadow-xs ring-1 ring-line"
        >
          <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="setup-title" className="text-title font-semibold text-ink">
              Get set up
            </h2>
            <span className="text-caption text-ink-3">{`${remaining} of ${steps.length} left`}</span>
          </header>
          <ol className="divide-y divide-line">
            {steps.map((step) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="flex flex-1 items-start gap-3">
                  {step.done ? (
                    <CircleCheck
                      className="mt-0.5 size-5 shrink-0 text-success"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : step.waiting ? (
                    <Clock
                      className="mt-0.5 size-5 shrink-0 text-ink-3"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 size-5 shrink-0 text-line-strong"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  )}
                  <span>
                    <span
                      className={cn(
                        "block text-body-sm font-semibold",
                        step.done ? "text-ink-2" : "text-ink",
                      )}
                    >
                      {step.title}
                      <span className="sr-only">
                        {step.done ? " (done)" : step.waiting ? " (waiting on Rumi)" : " (to do)"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-body-sm text-ink-2">{step.body}</span>
                  </span>
                </span>
                {step.href && !step.done ? (
                  <Link
                    href={step.href}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-md px-3 text-body-sm font-medium text-ink ring-1 ring-line-strong outline-none ring-inset hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus sm:self-center"
                  >
                    {step.cta}
                    <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {overview ? (
        <Dashboard overview={overview} weeks={weeks} canSeeStudents={props.canSeeStudents} />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="team-title"
          className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line"
        >
          <h2 id="team-title" className="text-title font-semibold text-ink">
            Your team
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-caption font-semibold text-ink-2"
                >
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{m.name}</span>
                <span className="text-caption text-ink-3">{ROLE_INFO[m.role].label}</span>
              </li>
            ))}
            {members.length === 0 ? (
              <li className="text-body-sm text-ink-3">
                Nobody yet. The Rumi team can send the first housing admin invite.
              </li>
            ) : null}
          </ul>
        </section>

        {recent.length > 0 ? (
          <section
            aria-labelledby="recent-title"
            className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="recent-title" className="text-title font-semibold text-ink">
                Recent activity
              </h2>
              <Link
                href="/staff/audit"
                className="rounded-sm text-body-sm font-medium text-accent-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              >
                Audit log
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {recent.map((row) => (
                <li key={row.id} className="flex items-baseline gap-3 text-body-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    <span className="font-medium">{row.actorName}</span>{" "}
                    <span className="text-ink-2">
                      {(AUDIT_LABELS[row.action] ?? row.action).toLowerCase()}
                    </span>
                  </span>
                  <RelativeTime iso={row.createdAt} className="shrink-0 text-caption text-ink-3" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-caption text-ink-3">{label}</span>
      <span className="text-title font-semibold text-ink sm:text-display-sm">{value}</span>
      {note ? <span className="text-caption text-ink-3">{note}</span> : null}
    </>
  );
  const className =
    "flex h-full flex-col gap-1 rounded-lg bg-surface p-3.5 shadow-xs ring-1 ring-line sm:p-4";
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className={cn(
            className,
            "transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

function Dashboard({
  overview,
  weeks,
  canSeeStudents,
}: {
  overview: Overview;
  weeks: number;
  canSeeStudents: boolean;
}) {
  const k = overview.kpis;
  const first = overview.funnel[0]?.n ?? 0;
  const weekLabel = (iso: string) => shortDate(iso);
  const series = (key: "signups" | "onboarded" | "matched") =>
    overview.weekly.map((w) => ({
      label: weekLabel(w.week),
      detail: `Week of ${weekLabel(w.week)}`,
      value: w[key],
    }));
  const bins = SCORE_BINS.map((bin) => ({
    label: BIN_LABELS[bin],
    detail:
      bin === "none"
        ? "No compatible match"
        : bin === "0-49"
          ? "Under 50"
          : `Best match ${BIN_LABELS[bin]}`,
    value: overview.distribution.find((d) => d.bin === bin)?.n ?? 0,
  }));
  const labelEvery = weeks > 26 ? 8 : weeks > 8 ? 4 : 2;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">This cycle</h2>
        <nav aria-label="Trend range" className="flex rounded-md bg-surface-sunken p-0.5">
          {WEEK_OPTIONS.map((w) => (
            <Link
              key={w}
              href={`/staff?weeks=${w}`}
              scroll={false}
              aria-current={w === weeks ? "true" : undefined}
              className={cn(
                "flex h-8 items-center rounded-sm px-3 text-caption font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus",
                w === weeks ? "bg-surface text-ink shadow-xs" : "text-ink-3 hover:text-ink",
              )}
            >
              {w === 52 ? "1 year" : `${w} weeks`}
            </Link>
          ))}
        </nav>
      </div>

      <ul
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5"
        aria-label="Key numbers"
      >
        <Kpi
          label="Students"
          value={count(k.students)}
          note={`${share(k.verified, k.students)} verified`}
        />
        <Kpi
          label="Finished profile"
          value={share(k.onboarded, k.students)}
          note={isSuppressed(k.onboarded) ? undefined : `${count(k.onboarded)} students`}
        />
        <Kpi
          label="Have a 70+ match"
          value={share(k.withStrongMatch, k.onboarded)}
          note="of finished profiles"
        />
        <Kpi
          label="In a pair or group"
          value={share(k.matched, k.onboarded)}
          note={isSuppressed(k.matched) ? "of finished profiles" : `${count(k.matched)} students`}
          href={canSeeStudents ? "/staff/pairings" : undefined}
        />
        <Kpi
          label="Unmatched"
          value={count(k.unmatched)}
          note="finished, no pair yet"
          href={canSeeStudents ? "/staff/students" : undefined}
        />
        <Kpi
          label="Intros sent"
          value={count(k.introsSent)}
          note={
            k.introsSent === 0
              ? "none yet"
              : k.introsSent < 5
                ? undefined
                : `${share(k.introsAccepted, k.introsSent)} accepted`
          }
        />
        <Kpi
          label="Median time to match"
          value={days(k.medianDaysToMatch)}
          note="profile done → paired"
        />
        <Kpi label="Open reports" value={count(k.openReports)} />
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarList
          title="Funnel"
          description="Where students are, from sign-up to a confirmed pair."
          valueLabel="Students"
          data={overview.funnel.map((f, i) => ({
            label: f.stage,
            detail: FUNNEL_LABELS[f.stage],
            value: f.n,
            note: i === 0 ? null : share(f.n, first),
          }))}
        />
        <ColumnChart
          title="Best-match scores"
          description="Each finished profile's single best mutual score."
          valueLabel="Students"
          data={bins}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ColumnChart
          title="New students"
          description="Sign-ups per week"
          valueLabel="Sign-ups"
          data={series("signups")}
          labelEvery={labelEvery}
          height={110}
        />
        <ColumnChart
          title="Finished profiles"
          description="Per week"
          valueLabel="Profiles"
          data={series("onboarded")}
          labelEvery={labelEvery}
          height={110}
        />
        <ColumnChart
          title="Newly paired"
          description="Students per week"
          valueLabel="Students"
          data={series("matched")}
          labelEvery={labelEvery}
          height={110}
        />
      </div>

      {overview.sources?.length ? (
        <BarList
          title="Where sign-ups came from"
          description="Students who finished a profile after arriving through one of your entry links."
          valueLabel="Students"
          data={overview.sources.map((r) => ({
            label: r.source,
            detail: SOURCE_LABEL[r.source as AttributionSource] ?? r.source,
            value: r.n === null ? 1 : r.n,
          }))}
        />
      ) : null}

      <ScoreSegments segments={overview.segments} />
    </div>
  );
}
