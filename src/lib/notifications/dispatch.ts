import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { CAMPUS_TZ } from "@/lib/time";
import { absoluteUrl } from "@/lib/utils";
import { CHANNELS, NOTIFICATION_KINDS, channelsFor, defaultMatrix, inQuietHours, type Matrix, type NotificationKind } from "./channels";
import { notifyInApp, type InAppNotice } from "./notify";
import { sendSms, smsNumber } from "./sms";
import { sendPush } from "./push";

/** A student's preferences grid: saved rows over defaults; the original email/in-app toggles still apply. */
export async function loadMatrix(userId: string): Promise<Matrix> {
  const db = createAdminClient();
  const [{ data: rows }, { data: legacy }] = await Promise.all([
    db.from("notification_preferences").select("kind, in_app, email, sms, push").eq("user_id", userId),
    db.from("user_settings").select("notify_inapp_intros, notify_inapp_messages, notify_inapp_matches, notify_inapp_groups, notify_email_intros, notify_email_messages, notify_email_matches, notify_email_groups").eq("user_id", userId).maybeSingle(),
  ]);
  const m = defaultMatrix();
  if (legacy) {
    for (const k of ["intros", "messages", "matches", "groups"] as const) {
      m[k].in_app = legacy[`notify_inapp_${k}`];
      m[k].email = legacy[`notify_email_${k}`];
    }
  }
  for (const r of rows ?? []) {
    if (!(NOTIFICATION_KINDS as readonly string[]).includes(r.kind)) continue;
    const k = r.kind as NotificationKind;
    m[k] = { in_app: r.in_app, email: r.email, sms: r.sms, push: r.push };
  }
  return m;
}

export interface Dispatch {
  kind: NotificationKind;
  notice: InAppNotice;
  email?: { subject: string; html: string; text: string };
  /** Short text for SMS/push; defaults to the notice title. */
  short?: string;
  urgent?: boolean;
}

/** Sends one notice on every channel the student allows (Phase 7.5). Never throws. */
export async function dispatch(d: Dispatch) {
  try {
    const db = createAdminClient();
    const userId = d.notice.userId;
    const [matrix, phone, { count: pushCount }, { data: settings }] = await Promise.all([
      loadMatrix(userId),
      serverEnv.sms.enabled ? smsNumber(userId) : Promise.resolve(null),
      publicEnv.pushEnabled ? db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId) : Promise.resolve({ count: 0 }),
      db.from("user_settings").select("email").eq("user_id", userId).maybeSingle(),
    ]);
    const channels = channelsFor(d.kind, { matrix, smsReady: Boolean(phone), pushReady: (pushCount ?? 0) > 0, quiet: inQuietHours(new Date(), CAMPUS_TZ), urgent: d.urgent });
    const short = (d.short ?? d.notice.title).slice(0, 140);
    const url = absoluteUrl(d.notice.href ?? "/notifications");
    await Promise.all(
      channels.map((c) => {
        if (c === "in_app") return notifyInApp([d.notice]);
        if (c === "email" && d.email && settings?.email) return sendEmail({ to: settings.email, ...d.email });
        if (c === "sms" && phone) return sendSms({ userId, to: phone, body: `Rumi: ${short} ${url} Reply STOP to opt out.`, kind: d.kind });
        if (c === "push") return sendPush(userId, { title: d.notice.title, body: d.notice.body ?? "", url });
        return Promise.resolve();
      }),
    );
    return channels;
  } catch (error) {
    console.error("[dispatch] failed", error);
    return [];
  }
}

export { CHANNELS };
