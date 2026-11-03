import Link from "next/link";
import { ArrowRight, CircleCheck, Circle, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RelativeTime } from "@/components/ui/relative-time";
import { ROLE_INFO, type StaffRole } from "@/lib/staff/roles";
import { AUDIT_LABELS, type AuditRow } from "@/lib/staff/team";
import { cn } from "@/lib/utils";

interface Props {
  firstName: string;
  schoolName: string;
  office: string | null;
  showSetup: boolean;
  checklist: { team: boolean; retention: boolean };
  members: { id: string; name: string; role: StaffRole }[];
  recent: AuditRow[];
}

export function StaffHome({ firstName, schoolName, office, showSetup, checklist, members, recent }: Props) {
  const steps = [
    {
      done: checklist.team,
      title: "Invite your team",
      body: "Add housing staff, RAs and analysts. Each role sees only what it needs.",
      href: "/staff/settings/team",
      cta: "Manage team",
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Hi, ${firstName}`} description={`${schoolName} housing on Rumi.`} className="pb-0 lg:pb-0" />

      {showSetup ? (
        <section aria-labelledby="setup-title" className="rounded-xl bg-surface shadow-xs ring-1 ring-line">
          <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="setup-title" className="text-title font-semibold text-ink">
              Get set up
            </h2>
            <span className="text-caption text-ink-3">
              {remaining === 0 ? "All done" : `${remaining} of ${steps.length} left`}
            </span>
          </header>
          <ol className="divide-y divide-line">
            {steps.map((step) => (
              <li key={step.title} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <span className="flex flex-1 items-start gap-3">
                  {step.done ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={2} aria-hidden />
                  ) : step.waiting ? (
                    <Clock className="mt-0.5 size-5 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-line-strong" strokeWidth={1.75} aria-hidden />
                  )}
                  <span>
                    <span className={cn("block text-body-sm font-semibold", step.done ? "text-ink-2" : "text-ink")}>
                      {step.title}
                      <span className="sr-only">{step.done ? " (done)" : step.waiting ? " (waiting on Rumi)" : " (to do)"}</span>
                    </span>
                    <span className="mt-0.5 block text-body-sm text-ink-2">{step.body}</span>
                  </span>
                </span>
                {step.href ? (
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="team-title" className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
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
              <li className="text-body-sm text-ink-3">Nobody yet. The Rumi team can send the first housing admin invite.</li>
            ) : null}
          </ul>
        </section>

        {recent.length > 0 ? (
          <section aria-labelledby="recent-title" className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
            <div className="flex items-baseline justify-between">
              <h2 id="recent-title" className="text-title font-semibold text-ink">
                Recent activity
              </h2>
              <Link href="/staff/audit" className="rounded-sm text-body-sm font-medium text-accent-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus">
                Audit log
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {recent.map((row) => (
                <li key={row.id} className="flex items-baseline gap-3 text-body-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    <span className="font-medium">{row.actorName}</span>{" "}
                    <span className="text-ink-2">{(AUDIT_LABELS[row.action] ?? row.action).toLowerCase()}</span>
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
