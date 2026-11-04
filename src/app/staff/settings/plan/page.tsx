import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  CohortManager,
  PilotManager,
  type CohortView,
  type PilotView,
} from "@/components/staff/pilot-manager";

export const metadata: Metadata = { title: "Plan & pilot" };
export const dynamic = "force-dynamic";

const list = (v: unknown, key: string) => {
  const raw = v && typeof v === "object" ? (v as Record<string, unknown>)[key] : null;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
};

/** Phase 9: plan display (no billing), pilot scope and comparison groups. */
export default async function PlanPage() {
  const context = await requireStaffPage("viewDashboard");
  const school = context.school.id;
  const canEdit = context.role === "housing_admin" || context.role === "platform_admin";
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: row },
    { data: pilot },
    { data: cohorts },
    { data: colleges },
    { data: terms },
    { count: onboardedCount },
  ] = await Promise.all([
    db.from("schools").select("plan, licensed_beds").eq("id", school).maybeSingle(),
    db
      .from("pilot_configs")
      .select("scope, starts_on, ends_on, success_metrics")
      .eq("school_id", school)
      .maybeSingle(),
    db
      .from("pilot_cohorts")
      .select("id, name, arm, term_id, rule")
      .eq("school_id", school)
      .order("created_at"),
    db
      .from("school_options")
      .select("value, label")
      .eq("school_id", school)
      .eq("kind", "residential_college")
      .eq("active", true)
      .order("position"),
    db
      .from("terms")
      .select("id, name")
      .eq("school_id", school)
      .order("starts_on", { ascending: false }),
    db
      .rpc("school_students", { p_school: school }, { count: "exact", head: true })
      .not("onboarding_completed_at", "is", null),
  ]);
  const onboarded = onboardedCount ?? 0;
  const beds = row?.licensed_beds ?? null;
  const plan = row?.plan === "standard" ? "Standard" : "Pilot";
  const metrics = (pilot?.success_metrics ?? {}) as PilotView["metrics"];

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <PageHeader
        title="Plan & pilot"
        description="Your plan, who the pilot covers, and the groups your outcomes report compares."
        className="pb-0 lg:pb-0"
      />

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="plan-title"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="plan-title" className="text-body font-semibold text-ink">
            {plan} plan
          </h2>
          <Badge variant="accent">{context.school.name}</Badge>
        </div>
        {beds ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-body-sm">
              <span className="text-ink-2">
                Students with a finished profile{pilot ? " in the pilot" : ""}
              </span>
              <span className="text-ink tabular-nums">
                {onboarded.toLocaleString("en-US")} of {beds.toLocaleString("en-US")} licensed beds
              </span>
            </div>
            <ProgressBar value={onboarded / beds} label="Licensed beds used" className="mt-2" />
          </div>
        ) : (
          <p className="mt-2 text-body-sm text-ink-2">
            {onboarded.toLocaleString("en-US")} students with a finished profile
            {pilot ? " in the pilot" : ""}. No bed count is set for your plan.
          </p>
        )}
        <p className="mt-4 text-body-sm text-ink-2">
          Plan and bed changes go through Rumi:{" "}
          <a
            className="font-medium text-accent-ink underline-offset-4 hover:underline"
            href={`mailto:${publicEnv.supportEmail}?subject=${encodeURIComponent(`Plan for ${context.school.name}`)}`}
          >
            {publicEnv.supportEmail}
          </a>
          . There&apos;s no billing in the app.
        </p>
        <p className="mt-4 flex items-start gap-2.5 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2">
          <HeartHandshake className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
          Students never pay and never see ads, on any plan.
        </p>
      </section>

      {canEdit ? (
        <>
          <PilotManager
            schoolId={school}
            today={today}
            colleges={colleges ?? []}
            pilot={
              pilot
                ? {
                    residentialColleges: list(pilot.scope, "residential_colleges"),
                    startsOn: pilot.starts_on,
                    endsOn: pilot.ends_on,
                    metrics,
                  }
                : null
            }
          />
          <CohortManager
            schoolId={school}
            colleges={colleges ?? []}
            terms={terms ?? []}
            cohorts={(cohorts ?? []).map((c): CohortView => ({
              id: c.id,
              name: c.name,
              arm: c.arm === "control" ? "control" : "rumi",
              termId: c.term_id,
              residentialColleges: list(c.rule, "residential_colleges"),
              buildings: list(c.rule, "buildings"),
            }))}
          />
        </>
      ) : pilot ? (
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6">
          <h2 className="text-body font-semibold text-ink">Pilot</h2>
          <p className="mt-1 text-body-sm text-ink-2">
            {pilot.starts_on} to {pilot.ends_on}. Housing admins can change it.
          </p>
        </section>
      ) : null}
    </div>
  );
}
