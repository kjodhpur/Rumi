"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_VERSION } from "@/lib/consent";
import { decrypt, encrypt, keyedHash } from "@/lib/crypto";
import { publicEnv, serverEnv } from "@/lib/env";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import {
  CHANNELS,
  LEGACY_KINDS,
  NOTIFICATION_KINDS,
  normalizeUsPhone,
  type NotificationKind,
} from "@/lib/notifications/channels";
import { loadMatrix } from "@/lib/notifications/dispatch";
import { sendSms } from "@/lib/notifications/sms";

const prefInput = z.object({
  kind: z.enum(NOTIFICATION_KINDS),
  channel: z.enum(CHANNELS),
  on: z.boolean(),
});

/** One cell of the preferences grid (Phase 7.5). */
export async function saveNotificationPreference(
  raw: z.input<typeof prefInput>,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = prefInput.safeParse(raw);
  if (!parsed.success) return fail("Couldn't save.");
  if (!(await rateLimit(`notif-prefs:${user.id}`, LIMITS.notificationPrefsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { kind, channel, on } = parsed.data;
  const supabase = createClient();

  if (on && channel === "sms") {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("phone_verified_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!serverEnv.sms.enabled) return fail("Texts aren't available yet.");
    if (!settings?.phone_verified_at) return fail("Verify your phone number first.");
  }
  if (on && channel === "push") {
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!publicEnv.pushEnabled) return fail("Push isn't available yet.");
    if (!count) return fail("Turn on push for this device first.");
  }

  if (
    (LEGACY_KINDS as readonly string[]).includes(kind) &&
    (channel === "in_app" || channel === "email")
  ) {
    const column =
      `notify_${channel === "in_app" ? "inapp" : "email"}_${kind}` as `notify_${"inapp" | "email"}_${(typeof LEGACY_KINDS)[number]}`;
    const patch: Partial<Record<typeof column, boolean>> = { [column]: on };
    const { error } = await supabase.from("user_settings").update(patch).eq("user_id", user.id);
    if (error) return fail("Couldn't save. Try again.");
  }
  const current = (await loadMatrix(user.id))[kind];
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, kind, ...current, [channel]: on, updated_at: new Date().toISOString() },
      { onConflict: "user_id,kind" },
    );
  if (error) return fail("Couldn't save. Try again.");
  revalidatePath("/settings/notifications");
  return ok();
}

// ─── Phone verification ──────────────────────────────────────────────────────

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const codeHash = (userId: string, code: string) =>
  createHash("sha256").update(`${userId}:${code}`).digest("hex");

/** Texts a six-digit code to a US mobile number. Nothing is saved on the account until it's confirmed. */
export async function startPhoneVerification(
  phone: string,
): Promise<ActionResult<{ last4: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!serverEnv.sms.enabled) return fail("Texts aren't available yet.");
  const e164 = typeof phone === "string" ? normalizeUsPhone(phone) : null;
  if (!e164) return fail("Enter a US mobile number, like (480) 555-0123.");
  if (!(await rateLimit(`phone-verify:${user.id}`, LIMITS.phoneVerificationsPerHour)))
    return fail("Too many codes. Try again in an hour.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = createAdminClient();
  const { error } = await db
    .from("phone_verifications")
    .upsert(
      {
        user_id: user.id,
        phone_enc: encrypt(e164),
        code_hash: codeHash(user.id, code),
        attempts: 0,
        expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) return fail("Couldn't send a code. Try again.");
  const sent = await sendSms({
    userId: user.id,
    to: e164,
    body: `Your Rumi code is ${code}. It expires in 10 minutes. Reply STOP to opt out.`,
    kind: "verification",
  });
  if (!sent) {
    await db.from("phone_verifications").delete().eq("user_id", user.id);
    return fail("Couldn't text that number. Check it and try again.");
  }
  return ok({ last4: e164.slice(-4) });
}

/** Confirms the code, saves the number encrypted, and records the student's consent to texts. */
export async function confirmPhoneVerification(code: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim()))
    return fail("Enter the six-digit code.");
  const db = createAdminClient();
  const { data: row } = await db
    .from("phone_verifications")
    .select("phone_enc, code_hash, attempts, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row || Date.parse(row.expires_at) < Date.now())
    return fail("That code expired. Send a new one.");
  if (row.attempts >= MAX_ATTEMPTS) return fail("Too many tries. Send a new code.");

  const expected = Buffer.from(row.code_hash);
  const given = Buffer.from(codeHash(user.id, code.trim()));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db
      .from("phone_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("user_id", user.id);
    return fail("That code doesn't match.");
  }

  const e164 = decrypt(row.phone_enc);
  const { error } = await db
    .from("user_settings")
    .update({
      phone_enc: row.phone_enc,
      phone_last4: e164.slice(-4),
      phone_hash: keyedHash("phone", e164),
      phone_verified_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (error) return fail("Couldn't save your number. Try again.");
  await db.from("phone_verifications").delete().eq("user_id", user.id);
  const { error: consentError } = await createClient().rpc("set_consent", {
    p_kind: "sms",
    p_granted: true,
    p_version: CONSENT_VERSION,
  });
  if (consentError) return fail(friendlyDbError(consentError.message));
  // Deadlines by text is what students verify for; everything else stays off until they choose.
  await saveNotificationPreference({ kind: "deadlines", channel: "sms", on: true });
  revalidatePath("/settings/notifications");
  revalidatePath("/settings/privacy");
  return ok();
}

/** Removes the number, revokes the text consent and turns every text off. */
export async function removePhone(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!(await rateLimit(`phone-verify:${user.id}`, LIMITS.phoneVerificationsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const db = createAdminClient();
  await Promise.all([
    db
      .from("user_settings")
      .update({ phone_enc: null, phone_last4: null, phone_hash: null, phone_verified_at: null })
      .eq("user_id", user.id),
    db.from("phone_verifications").delete().eq("user_id", user.id),
    db.from("notification_preferences").update({ sms: false }).eq("user_id", user.id),
  ]);
  await createClient().rpc("set_consent", {
    p_kind: "sms",
    p_granted: false,
    p_version: CONSENT_VERSION,
  });
  revalidatePath("/settings/notifications");
  revalidatePath("/settings/privacy");
  return ok();
}

// ─── Web push ────────────────────────────────────────────────────────────────

const pushInput = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  userAgent: z.string().max(300).optional(),
  /** The notice kinds to turn push on for; defaults to messages and deadlines. */
  kinds: z.array(z.enum(NOTIFICATION_KINDS)).max(NOTIFICATION_KINDS.length).optional(),
});

export async function savePushSubscription(raw: z.input<typeof pushInput>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!publicEnv.pushEnabled) return fail("Push isn't available yet.");
  const parsed = pushInput.safeParse(raw);
  if (!parsed.success) return fail("Your browser sent a subscription we can't use.");
  if (!(await rateLimit(`push-sub:${user.id}`, LIMITS.pushSubscriptionsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const db = createAdminClient();
  // A browser has one endpoint; whoever is signed in on it now owns it.
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: parsed.data.userAgent ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) return fail("Couldn't turn on push. Try again.");
  const kinds: NotificationKind[] = parsed.data.kinds ?? ["messages", "deadlines"];
  const matrix = await loadMatrix(user.id);
  const fresh = kinds.filter((k) => !matrix[k].push);
  if (fresh.length) {
    await createClient()
      .from("notification_preferences")
      .upsert(
        fresh.map((k) => ({
          user_id: user.id,
          kind: k,
          ...matrix[k],
          push: true,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,kind" },
      );
  }
  revalidatePath("/settings/notifications");
  return ok();
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (typeof endpoint !== "string" || endpoint.length > 1000)
    return fail("Couldn't turn off push.");
  const supabase = createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!count)
    await supabase.from("notification_preferences").update({ push: false }).eq("user_id", user.id);
  revalidatePath("/settings/notifications");
  return ok();
}
