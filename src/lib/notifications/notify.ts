import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "./types";

export interface InAppNotice {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  actorId?: string | null;
  entityId?: string | null;
}

/**
 * In-app notifications. An unread notification for the same entity is never duplicated
 * (unique index), so repeated calls are safe. Failures are logged, never thrown: a missed
 * notice must not undo the action that caused it.
 */
export async function notifyInApp(notices: InAppNotice[]) {
  if (!notices.length) return;
  const db = createAdminClient();
  for (const n of notices) {
    const { error } = await db.from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title.slice(0, 140),
      body: (n.body ?? "").slice(0, 280),
      href: n.href ?? null,
      actor_id: n.actorId ?? null,
      entity_id: n.entityId ?? null,
    });
    if (error && error.code !== "23505") console.error("[notify] in-app insert failed", error);
  }
}
