import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyedHash } from "@/lib/crypto";
import { CONSENT_VERSION } from "@/lib/consent";
import { serverEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";
import { normalizeUsPhone, smsKeyword } from "@/lib/notifications/channels";
import { validTwilioSignature } from "@/lib/notifications/sms";

export const dynamic = "force-dynamic";

const twiml = (message?: string) =>
  new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${message}</Message>` : ""}</Response>`,
    {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    },
  );

const HELP =
  "Rumi: roommate matching reminders. Manage texts in Settings, Notifications. Reply STOP to opt out. Msg and data rates may apply.";

/**
 * Twilio inbound webhook (Phase 7.5). STOP revokes the text consent and turns texts off;
 * START turns them back on for a number that was verified; HELP answers. Nothing else is
 * read or stored: the log keeps the keyword, never the message.
 */
export async function POST(request: NextRequest) {
  if (!serverEnv.sms.enabled) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  if (
    !validTwilioSignature(
      absoluteUrl("/api/sms/inbound"),
      params,
      request.headers.get("x-twilio-signature"),
    )
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const keyword = smsKeyword(params.Body ?? "");
  const phone = normalizeUsPhone(params.From ?? "");
  const db = createAdminClient();
  const { data: accounts } = phone
    ? await db.from("user_settings").select("user_id").eq("phone_hash", keyedHash("phone", phone))
    : { data: [] as { user_id: string }[] };
  const userIds = (accounts ?? []).map((a) => a.user_id);
  await db
    .from("sms_messages")
    .insert(
      (userIds.length ? userIds : [null]).map((userId) => ({
        user_id: userId,
        direction: "inbound" as const,
        kind: keyword ?? "other",
        body: keyword ?? "other",
        status: "received" as const,
        provider_sid: params.MessageSid ?? null,
      })),
    );

  if (keyword === "stop") {
    if (userIds.length) {
      const now = new Date().toISOString();
      await Promise.all([
        db
          .from("consents")
          .update({ revoked_at: now })
          .in("user_id", userIds)
          .eq("kind", "sms")
          .is("revoked_at", null),
        db
          .from("notification_preferences")
          .update({ sms: false, updated_at: now })
          .in("user_id", userIds),
      ]);
    }
    // Carriers and Twilio send the opt-out confirmation themselves.
    return twiml();
  }
  if (keyword === "start") {
    const { data: verified } = userIds.length
      ? await db
          .from("user_settings")
          .select("user_id, profiles!inner(school_id, is_staff)")
          .in("user_id", userIds)
          .not("phone_verified_at", "is", null)
      : { data: [] };
    for (const row of verified ?? []) {
      const profile = row.profiles as unknown as { school_id: string | null; is_staff: boolean };
      if (!profile.school_id || profile.is_staff) continue;
      const { data: live } = await db
        .from("consents")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("kind", "sms")
        .is("revoked_at", null)
        .maybeSingle();
      if (!live)
        await db
          .from("consents")
          .insert({
            user_id: row.user_id,
            school_id: profile.school_id,
            kind: "sms",
            version: CONSENT_VERSION,
          });
    }
    return twiml(
      "Rumi: texts are back on. Pick which reminders you get in Settings, Notifications. Reply STOP to opt out.",
    );
  }
  if (keyword === "help") return twiml(HELP);
  return twiml(HELP);
}
