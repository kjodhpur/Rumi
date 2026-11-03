import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Shield, Database, Calendar, Users, HelpCircle, Key, Layers } from "lucide-react";

export const metadata: Metadata = { title: "Campus Setup Checklist" };

export default async function CampusSetupPage() {
  const context = await requireStaffPage("viewDashboard");
  const db = createAdminClient();

  const [
    { data: school },
    { data: terms },
    { data: staffMembers },
    { data: integrationCreds },
    { data: rules },
  ] = await Promise.all([
    db.from("schools").select("id, name, email_domains").eq("id", context.school.id).maybeSingle(),
    db.from("terms").select("id, name, active").eq("school_id", context.school.id),
    db.from("staff_members").select("id, role").eq("school_id", context.school.id),
    db.from("integration_credentials").select("provider, active").eq("school_id", context.school.id),
    db.from("school_rules").select("id").eq("school_id", context.school.id),
  ]);

  const hasDomains = Boolean(school?.email_domains && school.email_domains.length > 0);
  const hasActiveTerm = Boolean(terms && terms.some((t) => t.active));
  const hasTeam = Boolean(staffMembers && staffMembers.length >= 1);
  const hasIntegration = Boolean(integrationCreds && integrationCreds.length > 0);
  const hasRules = Boolean(rules && rules.length > 0);

  const steps = [
    {
      id: "domains",
      title: "1. Campus Email Domain Verification",
      description: "Allowlisted email domains for student account provisioning (e.g. @asu.edu).",
      completed: hasDomains,
      href: "/staff/settings/privacy",
      icon: <Shield className="size-5" />,
    },
    {
      id: "term",
      title: "2. Term & Deadlines Schedule",
      description: "Define room selection windows, roommate request deadlines, and move-in dates.",
      completed: hasActiveTerm,
      href: "/staff/settings/term",
      icon: <Calendar className="size-5" />,
    },
    {
      id: "rules",
      title: "3. Academic & Residential College Rules",
      description: "Configure freshman same-college matching, LLC cohorts, and Barrett honors rules.",
      completed: hasRules,
      href: "/staff/settings/term",
      icon: <Layers className="size-5" />,
    },
    {
      id: "sso",
      title: "4. Single Sign-On (ASU Shibboleth / SAML)",
      description: "Review SP metadata and attribute release requirements with campus IT.",
      completed: true, // Configured for ASU launch
      href: "/docs/sso-asu.md",
      icon: <Key className="size-5" />,
    },
    {
      id: "integrations",
      title: "5. StarRez Integration & Portal Deep Links",
      description: "Connect StarRez REST credentials, questionnaire mappings, and resident portal widget.",
      completed: hasIntegration,
      href: "/staff/integrations/starrez",
      icon: <Database className="size-5" />,
    },
    {
      id: "team",
      title: "6. Staff Team & RA Workspace Access",
      description: "Invite housing coordinators, building RAs, and disability accommodation liaisons.",
      completed: hasTeam,
      href: "/staff/settings/team",
      icon: <Users className="size-5" />,
    },
    {
      id: "escalation",
      title: "7. Title IX & CARE Safety Routing",
      description: "Configure crisis contact numbers and campus emergency escalation endpoints.",
      completed: true,
      href: "/staff/settings/escalation",
      icon: <HelpCircle className="size-5" />,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        title="Campus Self-Serve Onboarding"
        description="Launch checklist for campus housing administrators. Configure term parameters, verify domain security, and connect StarRez."
      />

      {/* Progress Card */}
      <div className="rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-title font-semibold text-ink">Readiness Progress</h2>
            <p className="text-body-sm text-ink-2">
              {completedCount} of {steps.length} setup milestones completed
            </p>
          </div>
          <span className="font-mono text-xl font-bold text-ember">
            {Math.round((completedCount / steps.length) * 100)}%
          </span>
        </div>

        <div className="w-full bg-sand rounded-full h-3 overflow-hidden">
          <div
            className="bg-ember h-full rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist Steps */}
      <ul className="divide-y divide-line rounded-xl bg-surface shadow-xs ring-1 ring-line overflow-hidden">
        {steps.map((step) => (
          <li key={step.id} className="p-5 flex items-start justify-between gap-4 hover:bg-surface-sunken/40 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-ink-3">
                {step.completed ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : (
                  <Circle className="size-5 text-ink-3" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-ink flex items-center gap-2">
                  <span>{step.title}</span>
                  {step.completed && (
                    <span className="text-caption px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Ready
                    </span>
                  )}
                </h3>
                <p className="text-body-sm text-ink-2 max-w-xl">{step.description}</p>
              </div>
            </div>

            <Button asChild variant="ghost" size="sm">
              <Link href={step.href}>
                <span>Configure</span>
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
