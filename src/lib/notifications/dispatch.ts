import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { CAMPUS_TZ } from "@/lib/time";
import { absoluteUrl } from "@/lib/utils";
import {
  CHANNELS,
  LEGACY_KINDS,
  NOTIFICATION_KINDS,
  channelsFor,
  defaultMatrix,
  inQuietHours,
  type Channel,
  type Matrix,
  type NotificationKind,
} from "./channels";
import { notifyInApp, type InAppNotice } from "./notify";
import { sendSms, smsNumber } from "./sms";
import { sendPush } from "./push";

/**
 * A student's preferences grid. In-app and email for the original four kinds live in
 * user_settings (database triggers read them), so those columns win; everything else
 * comes from notification_preferences over the defaults.
 */
export async function loadMatrix(userId: string): Promise<Matrix> {
  const db = createAdminClient();
  const [{ data: rows }, { data: legacy }] = await Promise.all([
    db
      .from("notification_preferences")
      .select("kind, in_app, email, sms, push")
      .eq("user_id", userId),
    db
      .from("user_settings")
      .select(
        "notify_inapp_intros, notify_inapp_messages, notify_inapp_matches, notify_inapp_groups, notify_email_intros, notify_email_messages, notify_email_matches, notify_email_groups",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const m = defaultMatrix();
  for (const r of rows ?? []) {
    if (!(NOTIFICATION_KINDS as readonly string[]).includes(r.kind)) continue;
    m[r.kind as NotificationKind] = { in_app: r.in_app, email: r.email, sms: r.sms, push: r.push };
  }
  if (legacy) {
    for (const k of LEGACY_KINDS) {
      m[k].in_app = legacy[`notify_inapp_${k}`];
      m[k].email = legacy[`notify_email_${k}`];
    }
  }
  return m;
}

interface Reach {
  matrix: Matrix;
  phone: string | null;
  pushReady: boolean;
  email: string | null;
}

async function reach(userId: string): Promise<Reach> {
  const db = createAdminClient();
  const [matrix, phone, { count }, { data: settings }] = await Promise.all([
    loadMatrix(userId),
    serverEnv.sms.enabled ? smsNumber(userId) : Promise.resolve(null),
    publicEnv.pushEnabled
      ? db
          .from("push_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      : Promise.resolve({ count: 0 }),
    db.from("user_settings").select("email").eq("user_id", userId).maybeSingle(),
  ]);
  return { matrix, phone, pushReady: (count ?? 0) > 0, email: settings?.email ?? null };
}

async function send(channel: Channel, d: Dispatch, r: Reach) {
  const short = (d.short ?? d.notice.title).slice(0, 140);
  const url = absoluteUrl(d.notice.href ?? "/notifications");
  if (channel === "in_app") return notifyInApp([d.notice]);
  if (channel === "email" && d.email && r.email) return sendEmail({ to: r.email, ...d.email });
  if (channel === "sms" && r.phone)
    return sendSms({
      userId: d.notice.userId,
      to: r.phone,
      body: `Rumi: ${short} ${url} Reply STOP to opt out.`,
      kind: d.kind,
    });
  if (channel === "push")
    return sendPush(d.notice.userId, { title: d.notice.title, body: d.notice.body ?? "", url });
}

export interface Dispatch {
  kind: NotificationKind;
  notice: InAppNotice;
  email?: { subject: string; html: string; text: string };
  /** Short text for SMS/push; defaults to the notice title. */
  short?: string;
  /** Safety notices skip quiet hours and the in-app preference. */
  urgent?: boolean;
  /** Channels another code path already handles (e.g. a database trigger's in-app row). */
  skip?: Channel[];
}

/** Sends one notice on every channel the student allows (Phase 7.5). Never throws. */
export async function dispatch(d: Dispatch): Promise<Channel[]> {
  try {
    const r = await reach(d.notice.userId);
    const channels = channelsFor(d.kind, {
      matrix: r.matrix,
      smsReady: Boolean(r.phone),
      pushReady: r.pushReady,
      quiet: inQuietHours(new Date(), CAMPUS_TZ),
      urgent: d.urgent,
    }).filter((c) => !d.skip?.includes(c));
    await Promise.all(channels.map((c) => send(c, d, r)));
    return channels;
  } catch (error) {
    console.error("[dispatch] failed", error);
    return [];
  }
}

/** The same notice kind to many students, a few at a time. */
export async function dispatchMany(
  kind: NotificationKind,
  notices: InAppNotice[],
  extra: Omit<Dispatch, "kind" | "notice"> = {},
) {
  for (let i = 0; i < notices.length; i += 10) {
    await Promise.all(
      notices.slice(i, i + 10).map((notice) => dispatch({ kind, notice, ...extra })),
    );
  }
}

/**
 * Texts and push only, for notices whose in-app row and email already go out elsewhere
 * (database triggers and the email helpers for intros, messages and groups).
 */
export function sendExtraChannels(kind: NotificationKind, notice: InAppNotice) {
  return dispatch({ kind, notice, skip: ["in_app", "email"] });
}

export { CHANNELS };
