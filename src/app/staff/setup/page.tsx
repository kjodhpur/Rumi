import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = { title: "Setup checklist" };
export const dynamic = "force-dynamic";

type State = "done" | "todo" | "optional";

interface Step {
  title: string;
  detail: string;
  state: State;
  href?: string;
  action?: string;
}

/** Self-serve onboarding checklist (Phase 9). Every check reads the school's real configuration. */
export default async function SetupPage() {
  const context = await requireStaffPage("viewDashboard");
  const school = context.school.id;
  const db = createAdminClient();
  const count = (q: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(q).then((r) => r.count ?? 0);

  const [{ data: row }, { data: term }, areas, questions, team, routes, mappings, rest, links] =
    await Promise.all([
      db
        .from("schools")
        .select("email_domains, sso_provider, sso_provider_id, housing_office_name")
        .eq("id", school)
        .maybeSingle(),
      db
        .from("terms")
        .select("name, deadlines")
        .eq("school_id", school)
        .eq("active", true)
        .maybeSingle(),
      count(
        db.from("areas").select("slug", { count: "exact", head: true }).eq("school_id", school),
      ),
      count(
        db
          .from("school_questions")
          .select("id", { count: "exact", head: true })
          .eq("school_id", school)
          .eq("is_active", true),
      ),
      count(
        db
          .from("staff_members")
          .select("user_id", { count: "exact", head: true })
          .eq("school_id", school)
          .is("disabled_at", null),
      ),
      count(
        db
          .from("escalation_routes")
          .select("id", { count: "exact", head: true })
          .eq("school_id", school)
          .eq("active", true),
      ),
      count(
        db
          .from("integration_mappings")
          .select("provider", { count: "exact", head: true })
          .eq("school_id", school),
      ),
      count(
        db
          .from("integration_credentials")
          .select("school_id", { count: "exact", head: true })
          .eq("school_id", school)
          .eq("sync_enabled", true),
      ),
      count(
        db
          .from("link_attributions")
          .select("id", { count: "exact", head: true })
          .eq("school_id", school),
      ),
    ]);
  const deadlines =
    term?.deadlines && typeof term.deadlines === "object"
      ? Object.values(term.deadlines as Record<string, unknown>).filter(Boolean).length
      : 0;
  const domains = row?.email_domains ?? [];
  const ssoReady = publicEnv.ssoEnabled && Boolean(row?.sso_provider_id);

  const steps: Step[] = [
    {
      title: "School email domains",
      detail: domains.length
        ? `Students sign up with ${domains.map((d) => `@${d}`).join(", ")}.`
        : "No domains yet. Rumi adds them for you; email us the domains your students use.",
      state: domains.length ? "done" : "todo",
      href: domains.length
        ? undefined
        : `mailto:${publicEnv.supportEmail}?subject=${encodeURIComponent("Email domains for Rumi")}`,
      action: "Email Rumi",
    },
    {
      title: "Neighborhoods",
      detail: areas
        ? `${areas} areas students can pick from for off-campus housing.`
        : "No areas yet. Rumi adds them with you.",
      state: areas ? "done" : "todo",
      href: areas
        ? undefined
        : `mailto:${publicEnv.supportEmail}?subject=${encodeURIComponent("Neighborhoods for Rumi")}`,
      action: "Email Rumi",
    },
    {
      title: "Term and deadlines",
      detail: term
        ? `${term.name}, with ${deadlines} ${deadlines === 1 ? "deadline" : "deadlines"} set. Reminders follow them.`
        : "Set the term students are matching for and its deadlines.",
      state: term && deadlines ? "done" : "todo",
      href: "/staff/settings/term",
      action: "Open term",
    },
    {
      title: "Your questions",
      detail: questions
        ? `${questions} of your own ${questions === 1 ? "question" : "questions"} live, after a Fair Housing review.`
        : "Optional. Rumi's own questions work without them.",
      state: questions ? "done" : "optional",
      href: "/staff/settings/term",
      action: "Questions",
    },
    {
      title: "Single sign-on",
      detail: ssoReady
        ? `Students sign in with ${row?.sso_provider === "saml" ? "your SAML identity provider" : "your identity provider"}.`
        : "Optional. Without it, students verify with a code sent to their school email.",
      state: ssoReady ? "done" : "optional",
      href: "/staff/settings/sso",
      action: "Single sign-on",
    },
    {
      title: "StarRez",
      detail: rest
        ? "REST sync is on."
        : mappings
          ? "Column mappings are saved for CSV export and import."
          : "Map columns for CSV export, or connect the REST API.",
      state: rest || mappings ? "done" : "todo",
      href: "/staff/integrations/starrez",
      action: "StarRez",
    },
    {
      title: "Team",
      detail:
        team > 1
          ? `${team} people on your team.`
          : "Invite housing staff, RAs and analysts. Each role sees only what it needs.",
      state: team > 1 ? "done" : "todo",
      href: "/staff/settings/team",
      action: "Invite",
    },
    {
      title: "Escalation routes",
      detail: routes
        ? `${routes} ${routes === 1 ? "route" : "routes"} for serious reports.`
        : "Say where serious reports go (Title IX, CARE, conduct). Until then students are told no office was notified.",
      state: routes ? "done" : "todo",
      href: "/staff/settings/escalation",
      action: "Routes",
    },
    {
      title: "Entry links",
      detail: links
        ? "Students are arriving through your links."
        : "Put the Rumi link in your portal, Canvas and emails so sign-ups are counted by source.",
      state: links ? "done" : "todo",
      href: "/staff/integrations/links",
      action: "Links",
    },
  ];
  const required = steps.filter((s) => s.state !== "optional");
  const done = required.filter((s) => s.state === "done").length;

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <PageHeader
        title="Setup checklist"
        description={`What ${row?.housing_office_name ?? "your office"} needs before students arrive.`}
        className="pb-0 lg:pb-0"
      />

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="progress-title"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="progress-title" className="text-body font-semibold text-ink">
            {done === required.length ? "Ready for students" : `${done} of ${required.length} done`}
          </h2>
          <span className="text-body-sm text-ink-2 tabular-nums">
            {Math.round((done / required.length) * 100)}%
          </span>
        </div>
        <ProgressBar value={done / required.length} label="Setup progress" className="mt-3" />
      </section>

      <ol className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
        {steps.map((step) => (
          <li key={step.title} className="flex flex-wrap items-start gap-4 px-4 py-4 sm:px-5">
            <span className="mt-0.5">
              {step.state === "done" ? (
                <CheckCircle2 className="size-5 text-success" aria-label="Done" />
              ) : step.state === "optional" ? (
                <MinusCircle className="size-5 text-ink-3" aria-label="Optional" />
              ) : (
                <Circle className="size-5 text-ink-3" aria-label="To do" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-ink">
                {step.title}
                {step.state === "optional" ? <Badge size="sm">Optional</Badge> : null}
              </h3>
              <p className="mt-0.5 text-body-sm text-ink-2">{step.detail}</p>
            </div>
            {step.href ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={step.href}>
                  {step.action}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
