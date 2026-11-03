import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffRole, parseScopes, type StaffRole, type StaffScopes } from "./roles";
import { effectivePolicy, type RetentionPolicy } from "@/lib/retention/policy";

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  scopes: StaffScopes;
  disabled: boolean;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: StaffRole;
  scopes: StaffScopes;
  expiresAt: string;
  createdAt: string;
  invitedBy: string | null;
}

export async function loadTeam(schoolId: string): Promise<{ members: TeamMember[]; invites: PendingInvite[] }> {
  const db = createAdminClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    db
      .from("staff_members")
      .select("id, user_id, role, scopes, disabled_at, created_at, profiles!staff_members_user_id_fkey(first_name, last_initial)")
      .eq("school_id", schoolId)
      .order("created_at"),
    db
      .from("staff_invites")
      .select("id, email, role, scopes, expires_at, created_at, profiles!staff_invites_created_by_fkey(first_name)")
      .eq("school_id", schoolId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: emails } = userIds.length
    ? await db.from("user_settings").select("user_id, email").in("user_id", userIds)
    : { data: [] as { user_id: string; email: string }[] };
  const emailOf = new Map((emails ?? []).map((e) => [e.user_id, e.email]));

  return {
    members: (members ?? [])
      .filter((m) => isStaffRole(m.role))
      .map((m) => {
        const profile = m.profiles as { first_name: string; last_initial: string } | null;
        const email = emailOf.get(m.user_id) ?? "";
        return {
          id: m.id,
          userId: m.user_id,
          name: profile?.first_name ? `${profile.first_name}${profile.last_initial ? ` ${profile.last_initial}.` : ""}` : email.split("@")[0],
          email,
          role: m.role as StaffRole,
          scopes: parseScopes(m.scopes),
          disabled: Boolean(m.disabled_at),
          joinedAt: m.created_at,
        };
      }),
    invites: (invites ?? [])
      .filter((i) => isStaffRole(i.role))
      .map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role as StaffRole,
        scopes: parseScopes(i.scopes),
        expiresAt: i.expires_at,
        createdAt: i.created_at,
        invitedBy: (i.profiles as { first_name: string } | null)?.first_name || null,
      })),
  };
}

export async function loadRetention(schoolId: string): Promise<{ policy: RetentionPolicy; customized: string[] }> {
  const { data } = await createAdminClient().from("retention_policies").select("entity, days").eq("school_id", schoolId);
  return { policy: effectivePolicy(data ?? []), customized: (data ?? []).map((r) => r.entity) };
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorName: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export const AUDIT_PAGE_SIZE = 50;

export async function loadAudit(
  schoolId: string,
  { action, before }: { action?: string; before?: string } = {},
): Promise<{ rows: AuditRow[]; actions: string[]; nextBefore: string | null }> {
  const db = createAdminClient();
  let query = db
    .from("audit_log")
    .select("id, action, entity, entity_id, meta, created_at, actor_id")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_SIZE + 1);
  if (action) query = query.eq("action", action);
  if (before) query = query.lt("created_at", before);
  const [{ data }, { data: distinct }] = await Promise.all([
    query,
    db.from("audit_log").select("action").eq("school_id", schoolId).order("action").limit(1000),
  ]);
  const rows = (data ?? []).slice(0, AUDIT_PAGE_SIZE);
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await db.from("profiles").select("id, first_name, last_initial").in("id", actorIds)
    : { data: [] as { id: string; first_name: string; last_initial: string }[] };
  const nameOf = new Map((actors ?? []).map((a) => [a.id, `${a.first_name}${a.last_initial ? ` ${a.last_initial}.` : ""}`]));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      // A null actor is either the nightly job or someone whose account was later deleted.
      actorName: r.actor_id
        ? nameOf.get(r.actor_id) || "Staff member"
        : r.action.startsWith("retention_")
          ? "Rumi (automatic)"
          : "A former team member",
      meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>,
      createdAt: r.created_at,
    })),
    actions: [...new Set((distinct ?? []).map((d) => d.action))],
    nextBefore: (data ?? []).length > AUDIT_PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
}

/** Plain-language description of an audit entry, for the log screen. */
export const AUDIT_LABELS: Record<string, string> = {
  staff_invite_sent: "Sent a staff invite",
  staff_invite_resent: "Resent a staff invite",
  staff_invite_revoked: "Withdrew a staff invite",
  staff_invite_accepted: "Joined the team",
  staff_role_changed: "Changed a role",
  staff_disabled: "Turned off someone's access",
  staff_enabled: "Turned someone's access back on",
  retention_changed: "Changed a retention period",
  retention_delete_inactive: "Deleted inactive accounts",
  term_created: "Created a term",
  term_updated: "Updated the term",
  pairing_approved: "Approved pairings",
  pairing_needs_review: "Marked pairings for review",
  pairing_unreviewed: "Moved pairings back to review",
  pairing_note: "Added a pairing note",
  nudge_sent: "Sent a nudge",
  auto_pair_run: "Ran auto-pair",
  proposal_approved: "Approved suggested pairs",
  proposal_rejected: "Rejected suggested pairs",
  proposal_proposed: "Reopened suggested pairs",
  proposals_sent: "Sent roommate suggestions",
  viewed_unmatched_students: "Opened the student list",
  viewed_pairings: "Opened pairings",
  viewed_auto_pair: "Opened auto-pair results",
};
