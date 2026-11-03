import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requireStaffPage } from "@/lib/staff/context";
import { AUDIT_LABELS, loadAudit, type AuditRow } from "@/lib/staff/team";

export const metadata: Metadata = { title: "Audit log" };

const stamp = (iso: string, tz: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });

function details(row: AuditRow) {
  const parts: string[] = [];
  for (const key of ["email", "role", "from", "to", "days", "count"] as const) {
    const value = row.meta[key];
    if (typeof value === "string" || typeof value === "number") parts.push(`${key} ${value}`);
  }
  return parts.join(" · ");
}

export default async function AuditPage({ searchParams }: { searchParams: { action?: string; before?: string } }) {
  const context = await requireStaffPage("viewAudit");
  const before = searchParams.before && !Number.isNaN(Date.parse(searchParams.before)) ? searchParams.before : undefined;
  const { rows, actions, nextBefore } = await loadAudit(context.school.id, { action: searchParams.action, before });
  const action = actions.includes(searchParams.action ?? "") ? searchParams.action : undefined;
  const tz = process.env.NEXT_PUBLIC_CAMPUS_TZ || "America/Phoenix";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Every staff action and every time staff open a student's records. Entries can't be edited or deleted."
        className="pb-0 lg:pb-0"
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-ink-2">Action</span>
          <Select name="action" defaultValue={action ?? ""} className="w-64">
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {AUDIT_LABELS[a] ?? a}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {action || before ? (
          <Button asChild variant="ghost">
            <Link href="/staff/audit">Clear</Link>
          </Button>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText strokeWidth={1.75} />}
          title="Nothing recorded yet"
          description="Invites, role changes, exports and every look at a student's records will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
          <table className="w-full text-left text-body-sm">
            <caption className="sr-only">Audit log entries, newest first</caption>
            <thead className="hidden border-b border-line bg-surface-sunken/60 text-caption text-ink-3 sm:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">When</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Who</th>
                <th scope="col" className="px-5 py-2.5 font-medium">What</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="flex flex-col gap-0.5 px-4 py-3 sm:table-row sm:px-0 sm:py-0">
                  <td className="text-caption text-ink-3 tabular-nums sm:px-5 sm:py-3 sm:text-body-sm sm:whitespace-nowrap">
                    <time dateTime={row.createdAt}>{stamp(row.createdAt, tz)}</time>
                  </td>
                  <td className="font-medium text-ink sm:px-5 sm:py-3">{row.actorName}</td>
                  <td className="text-ink sm:px-5 sm:py-3">{AUDIT_LABELS[row.action] ?? row.action}</td>
                  <td className="text-ink-2 sm:px-5 sm:py-3">{details(row) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextBefore ? (
        <div>
          <Button asChild variant="secondary">
            <Link href={`/staff/audit?${new URLSearchParams({ ...(action ? { action } : {}), before: nextBefore })}`}>
              Older entries
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
