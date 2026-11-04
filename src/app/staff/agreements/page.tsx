import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadCompletion, visibleSignedAgreements } from "@/lib/staff/agreements";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricBars } from "@/components/staff/charts";

export const metadata: Metadata = { title: "Agreements" };
export const dynamic = "force-dynamic";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Phase 4 staff view: completion by building (totals) and signed agreements shared with housing. */
export default async function StaffAgreementsPage() {
  const context = await requireStaffPage("raWorkspace");
  const [completion, signed] = await Promise.all([
    loadCompletion(context.school.id),
    visibleSignedAgreements(context),
  ]);
  if (signed.length)
    await logAudit({
      actorId: context.userId,
      schoolId: context.school.id,
      action: "signed_agreements_listed",
      entity: "agreement",
      meta: { count: signed.length },
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agreements"
        description={
          context.role === "ra"
            ? "Roommate agreements in your buildings."
            : "How many groups have signed a roommate agreement, by building. Counts under 5 show as <5."
        }
        className="pb-0 lg:pb-0"
      />
      {completion.length ? (
        <MetricBars
          title="Signed, by building"
          description="Share of groups with a signed agreement. A group's building comes from its members' housing assignment."
          valueLabel="Signed"
          nLabel="groups"
          data={completion.map((c) => ({
            label: c.building,
            bar: c.groups && c.signed !== null && c.groups >= 5 ? c.signed / c.groups : null,
            display:
              c.groups === null || c.signed === null
                ? "<5"
                : c.groups < 5
                  ? "—"
                  : `${Math.round((c.signed / c.groups) * 100)}%`,
            n: c.groups === null ? "<5" : c.groups.toLocaleString("en-US"),
          }))}
        />
      ) : (
        <EmptyState
          icon={<FileSignature strokeWidth={1.75} />}
          title="No groups yet"
          description="Completion shows here once students form groups."
        />
      )}

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="signed-title"
      >
        <h2 id="signed-title" className="text-body font-semibold text-ink">
          Signed agreements you can read
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          Only groups where everyone chose to share their results with your office. Opening one is
          recorded in the audit log.
        </p>
        {signed.length ? (
          <ul className="mt-4 divide-y divide-line rounded-lg ring-1 ring-line">
            {signed.map((a) => (
              <li key={a.groupId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-ink">{a.members.join(", ")}</p>
                  <p className="text-caption text-ink-3">
                    {a.building ?? "Not moved in"} · signed {date(a.signedAt)}
                  </p>
                </div>
                <Link
                  href={`/staff/agreements/${a.groupId}`}
                  className="text-body-sm font-medium text-accent-ink underline-offset-4 hover:underline"
                >
                  Read
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2">
            None shared with you yet.
          </p>
        )}
      </section>
    </div>
  );
}
