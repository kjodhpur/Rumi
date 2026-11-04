import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

/** Texts through Twilio's REST API (Phase 7.5). Every send is logged without message text. */
export async function sendSms(input: {
  userId: string | null;
  to: string;
  body: string;
  kind: string;
}): Promise<boolean> {
  const { enabled, accountSid, authToken, from, messagingServiceSid } = serverEnv.sms;
  const db = createAdminClient();
  const log = (
    status: "sent" | "failed" | "skipped",
    extra: { provider_sid?: string; error?: string } = {},
  ) =>
    db.from("sms_messages").insert({
      user_id: input.userId,
      direction: "outbound",
      kind: input.kind,
      body: input.kind,
      status,
      ...extra,
    });
  if (!enabled || !accountSid || !authToken || (!from && !messagingServiceSid)) {
    await log("skipped", { error: "SMS isn't configured" });
    return false;
  }
  const form = new URLSearchParams({ To: input.to, Body: input.body.slice(0, 320) });
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
  else form.set("From", from);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(8000),
      },
    );
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      await log("failed", { error: (json.message ?? `Twilio ${res.status}`).slice(0, 300) });
      return false;
    }
    await log("sent", { provider_sid: json.sid });
    return true;
  } catch (error) {
    await log("failed", { error: error instanceof Error ? error.message.slice(0, 300) : "failed" });
    return false;
  }
}

/** A verified phone number for a student who consented to texts, or null. */
export async function smsNumber(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const [{ data: settings }, { data: consent }] = await Promise.all([
    db
      .from("user_settings")
      .select("phone_enc, phone_verified_at")
      .eq("user_id", userId)
      .maybeSingle(),
    db.rpc("has_consent", { p_uid: userId, p_kind: "sms" }),
  ]);
  if (!settings?.phone_enc || !settings.phone_verified_at || consent !== true) return null;
  try {
    return decrypt(settings.phone_enc);
  } catch {
    return null;
  }
}

/** Twilio webhook signature (X-Twilio-Signature): HMAC-SHA1 of the URL plus sorted params. */
export function validTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const token = serverEnv.sms.authToken;
  if (!token || !signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = Buffer.from(createHmac("sha1", token).update(data).digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
