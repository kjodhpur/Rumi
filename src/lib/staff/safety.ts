import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/photos";
import type { EscalationCategory, EscalationRoute } from "@/lib/safety/escalation";

export type SchoolReportStatus = "open" | "reviewing" | "actioned" | "dismissed";
export type SchoolReportFilter = "open" | "reviewing" | "actioned" | "dismissed" | "all";

export interface StaffReportItem {
  id: string;
  reason: string;
  details: string | null;
  context: {
    message_id?: string | null;
    conversation_id?: string | null;
    excerpt?: string | null;
  } | null;
  source: "user" | "auto";
  status: SchoolReportStatus;
  resolutionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reported: {
    id: string;
    firstName: string;
    lastInitial: string;
    avatarUrl: string | null;
    bannedAt: string | null;
  };
  reporter: {
    id: string;
    firstName: string;
    lastInitial: string;
  } | null;
  escalation: {
    id: string;
    category: EscalationCategory;
    destination: string;
    status: "pending" | "forwarded" | "closed";
    forwardedAt: string | null;
  } | null;
}

export interface StaffEscalationItem {
  id: string;
  reportId: string;
  category: EscalationCategory;
  destinationLabel: string;
  studentConsented: boolean;
  status: "pending" | "forwarded" | "closed";
  forwardedAt: string | null;
  forwardedByName: string | null;
  notes: string | null;
  createdAt: string;
  reported: {
    id: string;
    name: string;
  };
  reporter: {
    id: string;
    name: string;
  } | null;
}

export interface StaffSafetyStats {
  open: number;
  reviewing: number;
  actioned: number;
  dismissed: number;
  escalated: number;
  routesCount: number;
  activeRoutesCount: number;
}

export interface SafetyLogItem {
  id: string;
  action: string;
  actorName: string | null;
  targetName: string | null;
  note: string | null;
  createdAt: string;
}

export async function loadStaffSchoolReports(schoolId: string): Promise<StaffReportItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("staff_school_reports", { p_school: schoolId });
  if (error || !data) {
    // Fallback: direct query join if RPC is not deployed yet in current environment
    const { data: reports } = await admin
      .from("reports")
      .select(`
        id, reason, details, context, source, status, resolution_note, reviewed_at, created_at,
        reported:profiles!reports_reported_id_fkey(id, first_name, last_initial, avatar_path, banned_at, school_id),
        reporter:profiles!reports_reporter_id_fkey(id, first_name, last_initial, school_id)
      `)
      .order("created_at", { ascending: false });

    if (!reports) return [];

    const schoolReports = reports.filter((r) => {
      const rep = r.reported as unknown as { school_id: string } | null;
      const reporter = r.reporter as unknown as { school_id: string } | null;
      if (!rep || rep.school_id !== schoolId) return false;
      if (reporter && reporter.school_id !== schoolId) return false;
      return true;
    });

    const reportIds = schoolReports.map((r) => r.id);
    const { data: escalations } = reportIds.length
      ? await admin.from("escalations").select("id, report_id, category, destination_label, status, forwarded_at").in("report_id", reportIds)
      : { data: [] };

    const escMap = new Map((escalations ?? []).map((e) => [e.report_id, e]));

    return schoolReports.map((r) => {
      const rep = r.reported as unknown as {
        id: string;
        first_name: string;
        last_initial: string;
        avatar_path: string | null;
        banned_at: string | null;
      };
      const reporter = r.reporter as unknown as {
        id: string;
        first_name: string;
        last_initial: string;
      } | null;
      const esc = escMap.get(r.id);

      return {
        id: r.id,
        reason: r.reason,
        details: r.details,
        context: (r.context as unknown as StaffReportItem["context"]) ?? null,
        source: (r.source as "user" | "auto") ?? "user",
        status: (r.status as SchoolReportStatus) ?? "open",
        resolutionNote: r.resolution_note,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at,
        reported: {
          id: rep.id,
          firstName: rep.first_name,
          lastInitial: rep.last_initial,
          avatarUrl: photoUrl(rep.avatar_path),
          bannedAt: rep.banned_at,
        },
        reporter: reporter
          ? {
              id: reporter.id,
              firstName: reporter.first_name,
              lastInitial: reporter.last_initial,
            }
          : null,
        escalation: esc
          ? {
              id: esc.id,
              category: esc.category as EscalationCategory,
              destination: esc.destination_label,
              status: esc.status as "pending" | "forwarded" | "closed",
              forwardedAt: esc.forwarded_at,
            }
          : null,
      };
    });
  }

  return data.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    context: (r.context as unknown as StaffReportItem["context"]) ?? null,
    source: (r.source as "user" | "auto") ?? "user",
    status: (r.status as SchoolReportStatus) ?? "open",
    resolutionNote: r.resolution_note,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
    reported: {
      id: r.reported_id,
      firstName: r.reported_first_name,
      lastInitial: r.reported_last_initial,
      avatarUrl: photoUrl(r.reported_avatar_path),
      bannedAt: r.reported_banned_at,
    },
    reporter: r.reporter_id
      ? {
          id: r.reporter_id,
          firstName: r.reporter_first_name || "Student",
          lastInitial: r.reporter_last_initial || "",
        }
      : null,
    escalation: r.escalation_id
      ? {
          id: r.escalation_id,
          category: r.escalation_category as EscalationCategory,
          destination: r.escalation_destination || "Campus office",
          status: r.escalation_status as "pending" | "forwarded" | "closed",
          forwardedAt: r.escalation_forwarded_at,
        }
      : null,
  }));
}

export async function loadStaffEscalationRoutes(schoolId: string): Promise<EscalationRoute[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("escalation_routes")
    .select("id, school_id, category, destination_label, url, phone, email, active, created_at, updated_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    category: row.category as EscalationCategory,
    destinationLabel: row.destination_label,
    url: row.url,
    phone: row.phone,
    email: row.email,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function loadStaffEscalations(schoolId: string): Promise<StaffEscalationItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("escalations")
    .select(`
      id, report_id, category, destination_label, student_consented, status, forwarded_at, notes, created_at,
      forwarded_by_profile:profiles!escalations_forwarded_by_fkey(first_name, last_initial),
      report:reports!escalations_report_id_fkey(
        reported:profiles!reports_reported_id_fkey(id, first_name, last_initial),
        reporter:profiles!reports_reporter_id_fkey(id, first_name, last_initial)
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const fwd = row.forwarded_by_profile as unknown as { first_name: string; last_initial: string } | null;
    const rep = row.report as unknown as {
      reported: { id: string; first_name: string; last_initial: string };
      reporter: { id: string; first_name: string; last_initial: string } | null;
    } | null;

    return {
      id: row.id,
      reportId: row.report_id,
      category: row.category as EscalationCategory,
      destinationLabel: row.destination_label,
      studentConsented: row.student_consented,
      status: row.status as "pending" | "forwarded" | "closed",
      forwardedAt: row.forwarded_at,
      forwardedByName: fwd ? `${fwd.first_name} ${fwd.last_initial}.` : null,
      notes: row.notes,
      createdAt: row.created_at,
      reported: {
        id: rep?.reported.id ?? "",
        name: rep ? `${rep.reported.first_name} ${rep.reported.last_initial}.` : "Unknown",
      },
      reporter: rep?.reporter
        ? {
            id: rep.reporter.id,
            name: `${rep.reporter.first_name} ${rep.reporter.last_initial}.`,
          }
        : null,
    };
  });
}

export async function loadStaffSafetyStats(schoolId: string): Promise<StaffSafetyStats> {
  const [reports, routes, escalations] = await Promise.all([
    loadStaffSchoolReports(schoolId),
    loadStaffEscalationRoutes(schoolId),
    loadStaffEscalations(schoolId),
  ]);

  return {
    open: reports.filter((r) => r.status === "open").length,
    reviewing: reports.filter((r) => r.status === "reviewing").length,
    actioned: reports.filter((r) => r.status === "actioned").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
    escalated: escalations.length,
    routesCount: routes.length,
    activeRoutesCount: routes.filter((r) => r.active).length,
  };
}

export async function loadStaffSafetyLog(schoolId: string): Promise<SafetyLogItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moderation_log")
    .select(`
      id, action, meta, created_at,
      actor:profiles!moderation_log_actor_id_fkey(first_name, last_initial),
      target:profiles!moderation_log_target_id_fkey(first_name, last_initial)
    `)
    .eq("meta->>school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => {
    const actor = row.actor as unknown as { first_name: string; last_initial: string } | null;
    const target = row.target as unknown as { first_name: string; last_initial: string } | null;
    const meta = (row.meta as Record<string, unknown>) ?? {};

    return {
      id: row.id,
      action: row.action,
      actorName: actor ? `${actor.first_name} ${actor.last_initial}.` : null,
      targetName: target ? `${target.first_name} ${target.last_initial}.` : null,
      note: typeof meta.note === "string" ? meta.note : null,
      createdAt: row.created_at,
    };
  });
}
