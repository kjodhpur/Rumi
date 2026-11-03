import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { suppressCount, wilson } from "@/lib/stats/wilson";

export const metadata: Metadata = { title: "Outcomes" };

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function OutcomesPage() {
  const context = await requireStaffPage("viewDashboard");
  const { data, error } = await createClient().rpc("staff_outcomes", { p_school: context.school.id });
  const row = error ? null : data?.[0];
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_outcomes",
    entity: "outcomes",
    meta: { available: Boolean(row) },
  });

  const groups = row?.groups_confirmed ?? 0;
  const signed = row?.agreements_signed ?? 0;
  const checkins = row?.checkins_submitted ?? 0;
  const scoreSum = row?.checkin_score_sum ?? 0;
  const completion = groups >= 5 ? wilson(signed, groups) : null;
  const average = checkins >= 5 ? scoreSum / checkins : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Outcomes"
        description="Counts from students who chose to share. 1 to 4 is shown as <5. Rates need at least 5. A second cohort is not set up yet, so there is nothing to call statistically significant."
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        <Stat label="Confirmed groups" value={String(suppressCount(groups))} detail="Two or more members, someone sharing with housing" />
        <Stat label="Signed agreements" value={String(suppressCount(signed))} detail={completion ? `${percent(signed / groups)} · 95% interval ${percent(completion.low)}–${percent(completion.high)}` : "Rate hidden until there are 5 groups"} />
        <Stat label="Check-ins sent" value={String(suppressCount(checkins))} detail="Only students who allowed check-in sharing" />
        <Stat label="Average check-in" value={average === null ? "—" : average.toFixed(1)} detail={average === null ? "Hidden until there are 5 check-ins" : "1 is rough, 5 is going well"} />
      </dl>
      <p className="text-body-sm text-ink-3">Not statistically significant. This school is the only arm, so there is no comparison yet.</p>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl bg-surface p-5 ring-1 ring-line">
      <dt className="text-caption font-medium text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1 font-display text-display-sm text-ink">{value}</dd>
      <p className="mt-2 text-body-sm text-ink-2">{detail}</p>
    </div>
  );
}
