import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/rate-limit";
import type { Json } from "@/types/database";

export interface AuditEntry {
  actorId: string | null;
  schoolId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, Json | undefined>;
}

/**
 * Appends to the audit log. Every staff read of student-level data and every
 * staff write goes through here. Failures are logged, never thrown: an audit
 * outage must not block a housing office mid-task, but it must be visible.
 */
export async function logAudit(entry: AuditEntry) {
  let ip: string | null = null;
  try {
    ip = clientIp();
  } catch {
    // Outside a request (cron): no IP.
  }
  const { error } = await createAdminClient()
    .from("audit_log")
    .insert({
      actor_id: entry.actorId,
      school_id: entry.schoolId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      meta: (entry.meta ?? {}) as NonNullable<Json>,
      ip,
    });
  if (error) console.error("[audit] insert failed", entry.action, error);
}
