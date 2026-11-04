import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaffPage, can } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadOutcomesReport } from "@/lib/staff/outcomes";
import {
  formatProportion,
  type ArmMetrics,
  type Comparison,
  type Proportion,
} from "@/lib/stats/outcomes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Outcomes" };
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ci = (p: Proportion) =>
  p.suppressed || !p.interval ? "—" : `${pct(p.interval.low)}–${pct(p.interval.high)}`;

function Row({
  label,
  rumi,
  control,
  comparison,
  note,
}: {
  label: string;
  rumi: Proportion;
  control: Proportion;
  comparison: Comparison;
  note?: string;
}) {
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">
        {label}
        {note ? <span className="block text-caption font-normal text-ink-3">{note}</span> : null}
      </th>
      <td className="px-3 py-3 text-right tabular-nums">
        <span className="font-semibold text-ink">{formatProportion(rumi)}</span>
        <span className="block text-caption text-ink-3">
          {rumi.suppressed ? "n suppressed" : `n = ${rumi.n} · ${ci(rumi)}`}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        <span className="font-semibold text-ink">{formatProportion(control)}</span>
        <span className="block text-caption text-ink-3">
          {control.suppressed ? "n suppressed" : `n = ${control.n} · ${ci(control)}`}
        </span>
      </td>
      <td className="py-3 pl-3 text-right">
        <Badge variant={comparison.significant ? "success" : "neutral"}>{comparison.label}</Badge>
      </td>
    </tr>
  );
}

function armSummary(m: ArmMetrics) {
  return m.students < 5 ? (m.students === 0 ? "0" : "<5") : String(m.students);
}

/**
 * Rumi vs. control (Phase 6). Every number comes from consented or imported data and every
 * cell with 1–4 students is suppressed. Demo schools say so in a banner.
 */
export default async function OutcomesPage() {
  const context = await requireStaffPage("viewDashboard");
  const report = await loadOutcomesReport(context.school.id);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_outcomes_report",
    entity: "outcomes",
    meta: { cohorts: report.cohorts.length },
  });
  const { rumi, control, comparisons: c } = report;

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Outcomes"
        description={`Rumi vs. a comparable group using your usual process${report.term ? `, ${report.term.name}` : ""}. 95% Wilson intervals; differences tested with a two-proportion z-test.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {can(context, "configureSchool") ? (
              <Button variant="secondary" asChild>
                <Link href="/staff/settings/plan">Comparison groups</Link>
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <a href="/api/staff/outcomes/export">
                <Download aria-hidden /> De-identified CSV
              </a>
            </Button>
          </div>
        }
        className="pb-0 lg:pb-0"
      />

      {report.synthetic ? (
        <p className="rounded-md bg-warning-soft px-4 py-3 text-body-sm text-ink" role="note">
          Synthetic data for demonstration. These numbers are not real outcomes.
        </p>
      ) : null}

      {!report.term ? (
        <EmptyState
          title="Set up a term first"
          description="Outcomes are reported per term."
          action={
            <Button asChild>
              <Link href="/staff/settings/term">Set up the term</Link>
            </Button>
          }
        />
      ) : !report.cohorts.some((x) => x.arm === "rumi") ||
        !report.cohorts.some((x) => x.arm === "control") ? (
        <EmptyState
          title="Define your pilot cohorts"
          description="Pick which residential colleges or buildings use Rumi and which comparable group is the control. Then this report fills in as assignments, check-ins and surveys arrive."
          action={
            can(context, "configureSchool") ? (
              <Button asChild>
                <Link href="/staff/settings/plan">Add comparison groups</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <section className="overflow-x-auto rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line">
            <table className="w-full min-w-[640px] text-body-sm">
              <caption className="pb-4 text-left text-caption text-ink-3">
                Rumi:{" "}
                {report.cohorts
                  .filter((x) => x.arm === "rumi")
                  .map((x) => x.name)
                  .join(", ")}{" "}
                ({armSummary(rumi)} students) · Control:{" "}
                {report.cohorts
                  .filter((x) => x.arm === "control")
                  .map((x) => x.name)
                  .join(", ")}{" "}
                ({armSummary(control)} students)
              </caption>
              <thead className="text-caption text-ink-3">
                <tr>
                  <th scope="col" className="pb-2 text-left font-medium">
                    Measure
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    Rumi
                  </th>
                  <th scope="col" className="px-3 pb-2 text-right font-medium">
                    Control
                  </th>
                  <th scope="col" className="pb-2 pl-3 text-right font-medium">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label="Asked for a room change"
                  note="Of students with an assignment"
                  rumi={rumi.roomChange}
                  control={control.roomChange}
                  comparison={c.roomChange}
                />
                <Row
                  label="Would room together again"
                  note="End-of-term survey, “yes”"
                  rumi={rumi.roomAgain}
                  control={control.roomAgain}
                  comparison={c.roomAgain}
                />
                <Row
                  label="Signed a roommate agreement"
                  note="Of students in a group"
                  rumi={rumi.agreement}
                  control={control.agreement}
                  comparison={c.agreement}
                />
                <Row
                  label="Back in housing next term"
                  note="From the next term's import"
                  rumi={rumi.retention}
                  control={control.retention}
                  comparison={c.retention}
                />
                <tr className="border-t border-line">
                  <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">
                    Median days to first room-change request
                  </th>
                  <td className="px-3 py-3 text-right text-ink tabular-nums">
                    {rumi.medianDaysToFirstChange ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-ink tabular-nums">
                    {control.medianDaysToFirstChange ?? "—"}
                  </td>
                  <td className="py-3 pl-3 text-right text-caption text-ink-3">
                    Shown with 5+ requests
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <th scope="row" className="py-3 pr-4 text-left font-medium text-ink">
                    Check-in average (1–5)
                    <span className="block text-caption font-normal text-ink-3">
                      Students who share check-ins
                    </span>
                  </th>
                  <td className="px-3 py-3 text-right text-ink tabular-nums">
                    {rumi.checkinAverage.suppressed ? "<5" : (rumi.checkinAverage.value ?? "—")}
                  </td>
                  <td className="px-3 py-3 text-right text-ink tabular-nums">
                    {control.checkinAverage.suppressed
                      ? "<5"
                      : (control.checkinAverage.value ?? "—")}
                  </td>
                  <td className="py-3 pl-3 text-right text-caption text-ink-3">Descriptive only</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section
            className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line"
            aria-labelledby="method"
          >
            <h2 id="method" className="text-body font-semibold text-ink">
              Methodology
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
              <li>
                Arms are set by your cohort rules (residential college or building). Students in
                neither arm are left out.
              </li>
              <li>
                Room changes come from in-app requests and your housing system import. Assignments
                define who&apos;s counted.
              </li>
              <li>
                Check-in scores count only for students who turned on check-in sharing. Survey
                answers are used in aggregate only.
              </li>
              <li>
                Proportions show a 95% Wilson score interval. “Statistically significant” means a
                pooled two-proportion z-test gave p &lt; 0.05; anything else is labeled “not
                statistically significant”. Arms are not randomized, so differences show
                association, not cause.
              </li>
              <li>
                Any cell with 1–4 students is shown as “&lt;5”. The CSV export holds only students
                who turned on “Help improve matching”, with no names, IDs or dates, and is empty
                below five rows.
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
