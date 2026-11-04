import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { MetricBars } from "@/components/staff/charts";
import { SegmentControls } from "@/components/staff/segment-controls";
import {
  barValue,
  compareSet,
  displayCount,
  displayValue,
  isDimension,
  isMetric,
  metricInfo,
  segmentLabel,
  SEGMENT_DIMENSIONS,
  type SegmentRow,
} from "@/lib/staff/segments";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Segments" };
export const dynamic = "force-dynamic";

const OPTION_KIND: Record<string, string> = {
  academic_college: "academic_college",
  residential_college: "residential_college",
  llc: "llc",
  campus: "campus",
};

/** 1.A: one metric across one dimension, aggregates only, small counts suppressed in SQL. */
export default async function SegmentsPage({
  searchParams,
}: {
  searchParams: { dim?: string; metric?: string; compare?: string };
}) {
  const context = await requireStaffPage("viewAnalytics");
  const school = context.school.id;
  const dimension = isDimension(searchParams.dim) ? searchParams.dim : "class_year";
  const metric = isMetric(searchParams.metric) ? searchParams.metric : "matched";
  const info = metricInfo(metric);
  const supabase = createClient();

  const [{ data, error }, { data: options }, { data: consistency }] = await Promise.all([
    supabase.rpc("staff_segments", { p_school: school, p_dimension: dimension, p_metric: metric }),
    OPTION_KIND[dimension]
      ? createAdminClient()
          .from("school_options")
          .select("value, label")
          .eq("school_id", school)
          .eq("kind", OPTION_KIND[dimension])
      : Promise.resolve({ data: [] as { value: string; label: string }[] }),
    context.role === "ra"
      ? Promise.resolve({ data: null })
      : supabase.rpc("staff_consistency_rate", { p_school: school }),
  ]);
  const labels = Object.fromEntries((options ?? []).map((o) => [o.value, o.label]));
  const rows = ((data ?? []) as SegmentRow[]).filter((r) => r.value !== "__total");
  const total = ((data ?? []) as SegmentRow[]).find((r) => r.value === "__total");
  const compare = compareSet(
    searchParams.compare,
    rows.map((r) => r.value),
  );
  const shown = compare.length ? rows.filter((r) => compare.includes(r.value)) : rows;
  const dimLabel = SEGMENT_DIMENSIONS.find((d) => d.key === dimension)!.label;
  const flag = consistency?.[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Segments"
        description={
          context.role === "ra"
            ? "Totals for students assigned to your buildings."
            : "Totals by group of students. Counts under 5 show as <5 and their bars are hidden."
        }
        className="pb-0 lg:pb-0"
      />
      <SegmentControls
        dimension={dimension}
        metric={metric}
        compare={compare}
        values={rows.map((r) => ({
          value: r.value,
          label: segmentLabel(dimension, r.value, labels),
        }))}
      />

      {error ? (
        <ErrorState title="Couldn't load segments" description="Refresh the page to try again." />
      ) : !rows.length ? (
        <EmptyState
          icon={<BarChart3 strokeWidth={1.75} />}
          title="No data for this view yet"
          description={`Nobody counts toward "${info.label.toLowerCase()}" yet. Try another metric.`}
        />
      ) : (
        <>
          <MetricBars
            title={`${info.label} by ${dimLabel.toLowerCase()}`}
            description={`Share of ${info.of}${total ? `. Everyone: ${displayValue(total, metric)} of ${displayCount(total.n)}` : ""}.`}
            valueLabel={info.label}
            nLabel={info.of}
            data={shown.map((r) => ({
              label: segmentLabel(dimension, r.value, labels),
              bar: barValue(r, metric),
              display: displayValue(r, metric),
              n: displayCount(r.n),
            }))}
          />
          <p className="text-caption text-ink-3">
            Segments come only from what students entered or your imports; nothing is inferred.
            Students without a value are under &quot;{segmentLabel(dimension, "unknown")}&quot;.
          </p>
        </>
      )}

      {flag ? (
        <section
          className="rounded-xl bg-surface p-5 ring-1 ring-line"
          aria-labelledby="flags-title"
        >
          <h2 id="flags-title" className="text-body font-semibold text-ink">
            Answer-consistency prompts
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            {flag.suppressed || flag.flagged === null
              ? "Fewer than 5 students"
              : `${flag.flagged.toLocaleString("en-US")} of ${flag.total.toLocaleString("en-US")} students (${flag.total ? Math.round((flag.flagged / flag.total) * 100) : 0}%)`}{" "}
            were shown a private prompt that two answers pulled in different directions. Who, and
            which answers, is never shown.
          </p>
        </section>
      ) : null}
    </div>
  );
}
