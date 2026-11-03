import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { inactivityWarningEmail } from "@/lib/email/templates";
import { logAudit } from "@/lib/staff/audit";
import { cutoff, effectivePolicy, planInactive, RETENTION_DEFAULTS, type RetentionPolicy } from "./policy";

export interface RetentionReport {
  school: string;
  orphanedConversations: number;
  warned: number;
  deleted: number;
  cleared: number;
  auditPurged: number;
}

async function policyFor(schoolId: string): Promise<RetentionPolicy> {
  const { data } = await createAdminClient().from("retention_policies").select("entity, days").eq("school_id", schoolId);
  return effectivePolicy(data ?? []);
}

/** Conversations nobody belongs to anymore, idle past the window: delete (messages cascade). */
async function purgeOrphanedConversations(policy: RetentionPolicy, now: Date) {
  const db = createAdminClient();
  const before = cutoff(now, policy.orphaned_messages).toISOString();
  const { data: stale } = await db
    .from("conversations")
    .select("id, created_at, last_message_at, conversation_members(user_id)")
    .or(`last_message_at.lt.${before},and(last_message_at.is.null,created_at.lt.${before})`)
    .limit(500);
  const orphaned = (stale ?? []).filter((c) => (c.conversation_members ?? []).length === 0).map((c) => c.id);
  if (orphaned.length === 0) return 0;
  const { error } = await db.from("conversations").delete().in("id", orphaned);
  if (error) throw error;
  return orphaned.length;
}

async function handleInactive(schoolId: string, policy: RetentionPolicy, now: Date) {
  const db = createAdminClient();
  const warnBefore = cutoff(now, policy.inactive_accounts - policy.inactive_warning).toISOString();
  const [{ data: people }, { data: staff }, { data: admins }] = await Promise.all([
    db
      .from("profiles")
      .select("id, last_active_at, inactivity_warned_at")
      .eq("school_id", schoolId)
      .eq("is_seed", false)
      .eq("is_staff", false)
      .or(`last_active_at.lte.${warnBefore},inactivity_warned_at.not.is.null`)
      .limit(1000),
    db.from("staff_members").select("user_id").eq("school_id", schoolId),
    db.from("admins").select("user_id"),
  ]);
  const protectedIds = new Set([...(staff ?? []), ...(admins ?? [])].map((r) => r.user_id));
  const plan = planInactive(
    (people ?? [])
      .filter((p) => !protectedIds.has(p.id))
      .map((p) => ({ id: p.id, lastActiveAt: p.last_active_at, warnedAt: p.inactivity_warned_at })),
    policy,
    now,
  );

  if (plan.clear.length > 0) {
    await db.from("profiles").update({ inactivity_warned_at: null }).in("id", plan.clear);
  }

  if (plan.warn.length > 0) {
    const { data: settings } = await db.from("user_settings").select("user_id, email").in("user_id", plan.warn);
    for (const row of settings ?? []) {
      await sendEmail({ to: row.email, ...inactivityWarningEmail(policy.inactive_warning) });
    }
    await db.from("profiles").update({ inactivity_warned_at: now.toISOString() }).in("id", plan.warn);
  }

  for (const id of plan.remove) {
    // Deleting the auth user cascades to the profile and everything that hangs off it.
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) console.error("[retention] delete failed", id, error);
  }
  if (plan.remove.length > 0) {
    await logAudit({
      actorId: null,
      schoolId,
      action: "retention_delete_inactive",
      entity: "profile",
      meta: { count: plan.remove.length },
    });
  }
  return { warned: plan.warn.length, deleted: plan.remove.length, cleared: plan.clear.length };
}

/** Nightly. Idempotent: a second run the same day finds nothing to do. */
export async function runRetention(now = new Date()): Promise<RetentionReport[]> {
  const db = createAdminClient();
  const { data: schools } = await db.from("schools").select("id");
  const reports: RetentionReport[] = [];

  // Orphaned conversations aren't school-scoped; use the strictest school window (the default if none).
  const policies = await Promise.all((schools ?? []).map((s) => policyFor(s.id)));
  const strictest = policies.reduce<RetentionPolicy | null>(
    (acc, p) => (!acc || p.orphaned_messages < acc.orphaned_messages ? p : acc),
    null,
  );
  const orphaned = strictest ? await purgeOrphanedConversations(strictest, now) : 0;

  for (const [index, school] of (schools ?? []).entries()) {
    const policy = policies[index];
    const inactive = await handleInactive(school.id, policy, now);
    const { data: purged } = await db.rpc("purge_audit_log", {
      p_school: school.id,
      p_before: cutoff(now, policy.audit_log).toISOString(),
    });
    reports.push({
      school: school.id,
      orphanedConversations: index === 0 ? orphaned : 0,
      ...inactive,
      auditPurged: purged ?? 0,
    });
  }
  // Platform-level rows (no school) follow the default window.
  await db.rpc("purge_audit_log", {
    p_school: null as unknown as string,
    p_before: cutoff(now, RETENTION_DEFAULTS.audit_log).toISOString(),
  });
  return reports;
}
