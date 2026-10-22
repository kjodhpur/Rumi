import { createAdminClient } from "./supabase/admin";

type NotifType =
  | "intro_received"
  | "intro_accepted"
  | "message"
  | "strong_match"
  | "group_invite";

/** Insert in-app notification and optionally email via Resend when prefs allow. */
export async function notifyUser(opts: {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
  emailSubject?: string;
}) {
  const admin = createAdminClient();
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", opts.userId)
    .maybeSingle();

  const inAppKey =
    opts.type === "intro_received" || opts.type === "intro_accepted" || opts.type === "group_invite"
      ? "in_app_intros"
      : opts.type === "message"
        ? "in_app_messages"
        : "in_app_matches";
  const emailKey =
    opts.type === "intro_received" || opts.type === "intro_accepted" || opts.type === "group_invite"
      ? "email_intros"
      : opts.type === "message"
        ? "email_messages"
        : "email_matches";

  let notificationId: string | null = null;
  if (!prefs || prefs[inAppKey] !== false) {
    const { data } = await admin
      .from("notifications")
      .insert({
        user_id: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        href: opts.href ?? null,
        meta: opts.meta ?? {},
      })
      .select("id")
      .single();
    notificationId = data?.id ?? null;
  }

  if (prefs?.[emailKey] && process.env.RESEND_API_KEY) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, first_name")
      .eq("id", opts.userId)
      .maybeSingle();
    if (profile?.email) {
      const sent = await sendResendEmail({
        to: profile.email,
        subject: opts.emailSubject ?? opts.title,
        html: `<p>Hi ${profile.first_name || "there"},</p><p>${opts.body}</p>${
          opts.href
            ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${opts.href}">Open in Rumi</a></p>`
            : ""
        }`,
      });
      if (sent && notificationId) {
        await admin
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", notificationId);
      }
    }
  }

  // Web Push stub — delivers when VAPID + push_subscriptions exist
  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    await deliverWebPushStub(opts.userId, opts.title, opts.body, opts.href);
  }

  return { notificationId };
}

export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.RESEND_FROM_EMAIL ?? "Rumi <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Records intent; full web-push crypto needs `web-push` package + VAPID in production. */
async function deliverWebPushStub(
  userId: string,
  title: string,
  body: string,
  href?: string,
) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint")
    .eq("user_id", userId);
  if (!subs?.length) return;
  // Log as event so ops can verify wiring without sending invalid payloads
  await admin.from("events").insert({
    user_id: userId,
    event_name: "push_attempt",
    meta: { title, body, href: href ?? null, subscription_count: subs.length },
  });
}
