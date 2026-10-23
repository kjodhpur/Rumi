import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { PAYMENT_SAFETY_TIP } from "@/lib/safety-copy";

export type ModerationFlag = "payment" | "contact" | "abuse" | "links";

/**
 * Roommate-scam and abuse patterns. Flags never block a message — they open an
 * automatic report for admins and can surface a safety tip in the thread.
 */
const PATTERNS: { flag: ModerationFlag; re: RegExp }[] = [
  {
    flag: "payment",
    re: /\b(zelle|venmo|cash\s?app|wire\s+(the\s+)?(money|transfer)|western\s+union|money\s?gram|gift\s?cards?|deposit\s+(first|now|today|before)|send\s+(me\s+)?(the\s+)?deposit|crypto|bitcoin|usdt)\b/i,
  },
  { flag: "contact", re: /\b(whats\s?app|telegram|signal\s+me|text\s+me\s+at|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/i },
  { flag: "links", re: /\bhttps?:\/\/(?!([a-z0-9-]+\.)*(asu\.edu|zillow\.com|apartments\.com|craigslist\.org)\b)[^\s]+/i },
  { flag: "abuse", re: /\b(kill\s+yourself|kys|fag+ot|retard(ed)?|n[i1]gg(a|er)|tranny)\b/i },
];

export function moderateText(text: string): ModerationFlag[] {
  return PATTERNS.filter(({ re }) => re.test(text)).map(({ flag }) => flag);
}

/** Payment or off-platform asks early in a chat deserve a gentle in-thread tip. */
export function needsSafetyTip(flags: ModerationFlag[]) {
  return flags.includes("payment");
}

/** Drops the payment safety tip into the thread, unless it already appeared there today. */
export async function postSafetyTip(conversationId: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("kind", "system")
    .eq("body", PAYMENT_SAFETY_TIP)
    .gte("created_at", since);
  if (count) return;
  await admin.from("messages").insert({ conversation_id: conversationId, kind: "system", body: PAYMENT_SAFETY_TIP });
}

export async function fileAutoReport(input: {
  reportedId: string;
  flags: ModerationFlag[];
  excerpt: string;
  conversationId?: string;
  messageId?: string;
  introId?: string;
}) {
  const severe = input.flags.includes("abuse") || input.flags.includes("payment");
  if (!severe) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .insert({
      reporter_id: null,
      reported_id: input.reportedId,
      reason: input.flags.includes("abuse") ? "harassment" : "scam",
      details: `Automatic flag: ${input.flags.join(", ")}`,
      source: "auto",
      context: {
        excerpt: input.excerpt.slice(0, 500),
        conversation_id: input.conversationId ?? null,
        message_id: input.messageId ?? null,
        intro_id: input.introId ?? null,
      },
    })
    .select("id")
    .single();
  await forwardToWebhook({ kind: "auto", reportId: data?.id, flags: input.flags, excerpt: input.excerpt });
}

/** Optional Slack/Discord-compatible webhook so moderators hear about reports fast. */
export async function forwardToWebhook(payload: Record<string, unknown>) {
  const url = serverEnv.moderationWebhookUrl;
  if (!url) return;
  try {
    const text = `Rumi moderation: ${payload.kind === "auto" ? "auto-flag" : "new report"} — ${JSON.stringify(payload).slice(0, 900)}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text, ...payload }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    console.error("[moderation] webhook failed", error);
  }
}
