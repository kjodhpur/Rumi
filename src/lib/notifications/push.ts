import "server-only";
import webpush from "web-push";
import { publicEnv, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** Web push (VAPID) to every browser a student subscribed (Phase 7.5). Dead subscriptions are removed. */
export async function sendPush(
  userId: string,
  payload: { title: string; body: string; url: string },
): Promise<number> {
  const { publicKey, privateKey, subject } = serverEnv.push;
  if (!publicEnv.pushEnabled || !publicKey || !privateKey) return 0;
  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 3600 },
      );
      sent += 1;
      await db
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410)
        await db.from("push_subscriptions").delete().eq("id", sub.id);
      else console.error("[push] send failed", status);
    }
  }
  return sent;
}
