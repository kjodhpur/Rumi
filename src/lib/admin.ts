import "server-only";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/photos";
import { isVerified } from "@/lib/verification";

/** Server-side admin gate. Returns the admin's user id or null. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? user.id : null;
}

export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";
export type ReportFilter = "open" | "reviewing" | "resolved" | "all";

export interface AdminPerson {
  id: string;
  firstName: string;
  lastInitial: string;
  email: string | null;
  avatarUrl: string | null;
  verified: boolean;
  bannedAt: string | null;
  banReason: string | null;
  isHidden: boolean;
  isSeed: boolean;
  onboarded: boolean;
  createdAt: string;
  reportCount: number;
}

export interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  source: "user" | "auto";
  status: ReportStatus;
  excerpt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
  reviewerName: string | null;
  reported: AdminPerson;
  reporter: { id: string; name: string } | null;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  actorName: string | null;
  target: { id: string; name: string } | null;
  note: string | null;
  createdAt: string;
}

export interface AdminStats {
  open: number;
  reviewing: number;
  autoThisWeek: number;
  banned: number;
  active: number;
  newThisWeek: number;
}

const WEEK_AGO = () => new Date(Date.now() - 7 * 86_400_000).toISOString();
const nameOf = (p: { first_name: string; last_initial: string } | undefined) =>
  p ? `${p.first_name}${p.last_initial ? ` ${p.last_initial}.` : ""}` : null;

export async function loadAdminStats(): Promise<AdminStats> {
  const db = createAdminClient();
  const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;
  const [open, reviewing, autoThisWeek, banned, active, newThisWeek] = await Promise.all([
    count(db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(db.from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewing")),
    count(db.from("reports").select("id", { count: "exact", head: true }).eq("source", "auto").gte("created_at", WEEK_AGO())),
    count(db.from("profiles").select("id", { count: "exact", head: true }).not("banned_at", "is", null)),
    count(
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("onboarding_completed_at", "is", null)
        .is("banned_at", null),
    ),
    count(db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", WEEK_AGO())),
  ]);
  return { open, reviewing, autoThisWeek, banned, active, newThisWeek };
}

/** Profile + private email + how often they've been reported, keyed by id. */
async function people(ids: string[]): Promise<Map<string, AdminPerson>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const db = createAdminClient();
  const [{ data: profiles }, { data: settings }, { data: reports }] = await Promise.all([
    db
      .from("profiles")
      .select("id, first_name, last_initial, avatar_path, student_verified_at, banned_at, ban_reason, is_hidden, is_seed, onboarding_completed_at, created_at")
      .in("id", unique),
    db.from("user_settings").select("user_id, email").in("user_id", unique),
    db.from("reports").select("reported_id").in("reported_id", unique),
  ]);
  const emails = new Map((settings ?? []).map((s) => [s.user_id, s.email]));
  const counts = new Map<string, number>();
  for (const r of reports ?? []) counts.set(r.reported_id, (counts.get(r.reported_id) ?? 0) + 1);
  return new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        firstName: p.first_name || "New student",
        lastInitial: p.last_initial,
        email: emails.get(p.id) ?? null,
        avatarUrl: photoUrl(p.avatar_path),
        verified: isVerified(p.student_verified_at),
        bannedAt: p.banned_at,
        banReason: p.ban_reason,
        isHidden: p.is_hidden,
        isSeed: p.is_seed,
        onboarded: Boolean(p.onboarding_completed_at),
        createdAt: p.created_at,
        reportCount: counts.get(p.id) ?? 0,
      },
    ]),
  );
}

export async function loadReports(filter: ReportFilter): Promise<AdminReport[]> {
  const db = createAdminClient();
  let query = db
    .from("reports")
    .select("id, reporter_id, reported_id, reason, details, context, source, status, resolution_note, reviewed_by, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (filter === "resolved") query = query.in("status", ["actioned", "dismissed"]);
  else if (filter !== "all") query = query.eq("status", filter);
  const { data: rows } = await query;
  if (!rows?.length) return [];

  const ids = rows.flatMap((r) => [r.reported_id, r.reporter_id, r.reviewed_by].filter((id): id is string => Boolean(id)));
  const byId = await people(ids);
  return rows.flatMap((r) => {
    const reported = byId.get(r.reported_id);
    if (!reported) return [];
    const reporter = r.reporter_id ? byId.get(r.reporter_id) : undefined;
    const reviewer = r.reviewed_by ? byId.get(r.reviewed_by) : undefined;
    const context = (r.context ?? {}) as { excerpt?: string | null };
    return [
      {
        id: r.id,
        reason: r.reason,
        details: r.details,
        source: r.source as AdminReport["source"],
        status: r.status as ReportStatus,
        excerpt: context.excerpt ?? null,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        resolutionNote: r.resolution_note,
        reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastInitial}.` : null,
        reported,
        reporter: reporter ? { id: reporter.id, name: `${reporter.firstName} ${reporter.lastInitial}.` } : null,
      },
    ];
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Finds people by name, email or id; with no query, lists the newest (or banned) accounts. */
export async function searchPeople(q: string, filter: "recent" | "banned"): Promise<AdminPerson[]> {
  const db = createAdminClient();
  const term = q.trim().slice(0, 80);
  let ids: string[];

  if (UUID.test(term)) {
    ids = [term];
  } else if (term) {
    const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const [{ data: byEmail }, { data: byName }] = await Promise.all([
      db.from("user_settings").select("user_id").ilike("email", pattern).limit(20),
      db.from("profiles").select("id").ilike("first_name", pattern).limit(20),
    ]);
    ids = [...(byEmail ?? []).map((r) => r.user_id), ...(byName ?? []).map((r) => r.id)];
  } else {
    let query = db.from("profiles").select("id").limit(30);
    query = filter === "banned"
      ? query.not("banned_at", "is", null).order("banned_at", { ascending: false })
      : query.order("created_at", { ascending: false });
    const { data } = await query;
    ids = (data ?? []).map((r) => r.id);
  }

  const byId = await people(ids);
  return [...new Set(ids)].flatMap((id) => {
    const person = byId.get(id);
    return person ? [person] : [];
  });
}

const ACTION_LABELS: Record<string, string> = {
  ban: "Suspended",
  unban: "Restored",
  revoke_verification: "Revoked verification for",
  report_open: "Reopened a report about",
  report_reviewing: "Started reviewing a report about",
  report_actioned: "Resolved a report about",
  report_dismissed: "Dismissed a report about",
};

export async function loadModerationLog(): Promise<AdminLogEntry[]> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from("moderation_log")
    .select("id, actor_id, action, target_id, report_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (!rows?.length) return [];

  // Report actions log the report, not the person — resolve who it was about.
  const reportIds = rows.map((r) => r.report_id).filter((id): id is string => Boolean(id));
  const { data: reports } = reportIds.length
    ? await db.from("reports").select("id, reported_id").in("id", reportIds)
    : { data: [] as { id: string; reported_id: string }[] };
  const reportedBy = new Map((reports ?? []).map((r) => [r.id, r.reported_id]));

  const targetOf = (r: (typeof rows)[number]) => r.target_id ?? (r.report_id ? reportedBy.get(r.report_id) ?? null : null);
  const personIds = rows.flatMap((r) => [r.actor_id, targetOf(r)].filter((id): id is string => Boolean(id)));
  const { data: profiles } = personIds.length
    ? await db.from("profiles").select("id, first_name, last_initial").in("id", [...new Set(personIds)])
    : { data: [] as { id: string; first_name: string; last_initial: string }[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const meta = (r.meta ?? {}) as Record<string, string | null>;
    const targetId = targetOf(r);
    const targetName = targetId ? nameOf(byId.get(targetId)) : null;
    return {
      id: r.id,
      action: ACTION_LABELS[r.action] ?? r.action.replace(/_/g, " "),
      actorName: r.actor_id ? nameOf(byId.get(r.actor_id)) : null,
      target: targetId && targetName ? { id: targetId, name: targetName } : null,
      note: meta.note ?? meta.reason ?? null,
      createdAt: r.created_at,
    };
  });
}
