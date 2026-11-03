import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "RA workspace" };

export default async function RaPage() {
  const context = await requireStaffPage("raWorkspace");
  const { data, error } = await createClient().rpc("ra_risk_list", { p_school: context.school.id });
  const rows = error ? [] : (data ?? []);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "viewed_ra_risk_list",
    entity: "checkin_list",
    meta: { count: rows.length },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Check-ins" description="Medium and high risk, and only students who shared the check-in or asked for help. Private notes stay hidden unless they shared them." />
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-body-sm text-ink-2 ring-1 ring-line">No shared alerts in your buildings.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={`${row.user_id}-${row.submitted_at}`} className="rounded-xl bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-body font-semibold text-ink">{row.first_name}</h2>
                <span className="text-caption font-medium text-ink-3 uppercase">{row.level}</span>
              </div>
              <p className="mt-1 text-body-sm text-ink-2">
                {row.building}
                {row.room ? ` · ${row.room}` : ""} · score {row.score}
                {row.ask_ra ? " · asked for help" : ""}
              </p>
              {row.reasons?.length ? (
                <ul className="mt-2 list-disc pl-5 text-body-sm text-ink-2">
                  {row.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {row.note ? <p className="mt-3 text-body-sm text-ink">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
