import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { can, requireStaffPage } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/staff/audit";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BarList, ColumnChart, MetricBars } from "@/components/staff/charts";
import {
  ReasonTaxonomy,
  RoomChangeQueue,
  type QueueItem,
} from "@/components/staff/room-change-tagging";
import { BAND_LABEL, monthlyTotals, parseRoomChangeStats } from "@/lib/staff/room-changes";

export const metadata: Metadata = { title: "Room changes" };
export const dynamic = "force-dynamic";

/** The charts draw any 1–4 count as a "<5" stub; a suppressed count from SQL becomes 1. */
const n = (v: number | null) => (v === null ? 1 : v);
const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** 1.B: why students move, by reason, month, building, original score band and agreement. */
export default async function RoomChangesPage() {
  const context = await requireStaffPage("viewAnalytics");
  const school = context.school.id;
  const canTag = can(context, "tagRoomChanges");
  const canEditReasons = can(context, "configureSchool");
  const db = createAdminClient();
  const [{ data, error }, { data: reasons }] = await Promise.all([
    createClient().rpc("staff_room_changes", { p_school: school }),
    db
      .from("room_change_reasons")
      .select("key, label, active")
      .eq("school_id", school)
      .order("position"),
  ]);
  const stats = parseRoomChangeStats(data);
  const label = (k: string) =>
    k === "untagged" ? "Untagged" : (reasons?.find((r) => r.key === k)?.label ?? k);

  // The tagging queue is student-level, so it is limited to tagging roles (RAs: their buildings) and audited.
  let queue: QueueItem[] = [];
  if (canTag) {
    let q = db
      .from("room_change_requests")
      .select(
        "id, building, created_at, source, reason_keys, staff_note, student_note, profiles!room_change_requests_user_id_fkey(first_name, last_initial)",
      )
      .eq("school_id", school)
      .order("created_at", { ascending: false })
      .limit(50);
    if (context.role === "ra")
      q = q.in(
        "building",
        context.scopes.buildings.length ? context.scopes.buildings : ["__none__"],
      );
    const { data: rows } = await q;
    queue = (rows ?? []).map((r) => {
      const p = r.profiles as unknown as { first_name: string; last_initial: string } | null;
      const source: QueueItem["source"] =
        r.source === "in_app" ? "student" : r.source === "staff" ? "staff" : "import";
      return {
        id: r.id,
        student: p ? `${p.first_name} ${p.last_initial}.` : "A student",
        building: r.building ?? "Unknown building",
        createdAt: r.created_at,
        source,
        reasonKeys: r.reason_keys,
        staffNote: r.staff_note,
        studentNote: r.student_note,
      };
    });
    if (queue.length)
      await logAudit({
        actorId: context.userId,
        schoolId: school,
        action: "room_change_queue_viewed",
        entity: "room_change_request",
        meta: { count: queue.length },
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Room changes"
        description="Why students ask to move, and whether low-score pairs move more. Counts under 5 show as <5."
        className="pb-0 lg:pb-0"
      />
      {error ? (
        <ErrorState
          title="Couldn't load room changes"
          description="Refresh the page to try again."
        />
      ) : !stats.total && stats.total !== null ? (
        <EmptyState
          icon={<ArrowLeftRight strokeWidth={1.75} />}
          title="No room changes yet"
          description="Requests students make in Rumi, and changes imported from StarRez, show up here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <MetricBars
            title="Do low-score pairs move more?"
            description="Share of assigned students who asked to move, by their match score with their roommate."
            valueLabel="Asked to move"
            nLabel="assigned"
            data={stats.byBand.map((b) => ({
              label: BAND_LABEL[b.band],
              bar: b.rate,
              display:
                b.assigned === 0 ? "—" : b.rate === null ? "<5" : `${Math.round(b.rate * 100)}%`,
              n: b.assigned === null ? "<5" : b.assigned.toLocaleString("en-US"),
            }))}
          />
          <BarList
            title="Reasons"
            description="A request can have up to three."
            valueLabel="Requests"
            data={stats.byReason.map((r) => ({ label: label(r.key), value: n(r.n) }))}
          />
          <ColumnChart
            title="Requests by month"
            valueLabel="Requests"
            data={monthlyTotals(stats.byMonth).map((m) => ({
              label: monthLabel(m.month),
              value: n(m.n),
            }))}
          />
          <BarList
            title="By building"
            valueLabel="Requests"
            data={stats.byBuilding.map((b) => ({
              label: b.building === "unknown" ? "Unknown" : b.building,
              value: n(b.n),
            }))}
          />
          <BarList
            title="Roommate agreement"
            description="Whether the group had signed one."
            valueLabel="Requests"
            data={stats.byAgreement.map((a) => ({
              label:
                a.signed === "true" ? "Signed" : a.signed === "false" ? "Not signed" : "No group",
              value: n(a.n),
            }))}
          />
        </div>
      )}
      {canTag ? <RoomChangeQueue schoolId={school} items={queue} reasons={reasons ?? []} /> : null}
      {canEditReasons ? <ReasonTaxonomy schoolId={school} reasons={reasons ?? []} /> : null}
    </div>
  );
}
