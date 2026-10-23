import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadAdminStats,
  loadModerationLog,
  loadReports,
  requireAdmin,
  searchPeople,
  type ReportFilter,
} from "@/lib/admin";
import { AdminDashboard, type AdminTab } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Safety admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: AdminTab[] = ["reports", "people", "log"];
const FILTERS: ReportFilter[] = ["open", "reviewing", "resolved", "all"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string; q?: string; filter?: string };
}) {
  if (!(await requireAdmin())) notFound();

  const tab = TABS.includes(searchParams.tab as AdminTab) ? (searchParams.tab as AdminTab) : "reports";
  const reportFilter = FILTERS.includes(searchParams.status as ReportFilter) ? (searchParams.status as ReportFilter) : "open";
  const peopleFilter = searchParams.filter === "banned" ? "banned" : "recent";
  const query = (searchParams.q ?? "").trim().slice(0, 80);

  const [stats, reports, people, log] = await Promise.all([
    loadAdminStats(),
    tab === "reports" ? loadReports(reportFilter) : Promise.resolve([]),
    tab === "people" ? searchPeople(query, peopleFilter) : Promise.resolve([]),
    tab === "log" ? loadModerationLog() : Promise.resolve([]),
  ]);

  return (
    <AdminDashboard
      tab={tab}
      stats={stats}
      reportFilter={reportFilter}
      reports={reports}
      peopleFilter={peopleFilter}
      query={query}
      people={people}
      log={log}
    />
  );
}
