import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { PAYMENT_SAFETY_TIP } from "@/lib/safety-copy";
import { isSevere, moderateText, type ModerationFlag } from "./patterns";
import {
  claudeClassifier,
  modelReportReason,
  screenText,
  type Classifier,
  type ModelVerdict,
} from "./classify";

export { isSevere, moderateText, type ModerationFlag };

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
  await admin
    .from("messages")
    .insert({ conversation_id: conversationId, kind: "system", body: PAYMENT_SAFETY_TIP });
}

interface Where {
  reportedId: string;
  excerpt: string;
  conversationId?: string;
  messageId?: string;
  introId?: string;
}

/**
 * Screens a sent message or intro and opens an automatic report when warranted. Regex
 * flags report exactly as before; the model (where allowed) can add a report for intent
 * the regex can't see. Neither blocks, hides or bans anything.
 */
export async function screenAndReport(input: Where) {
  const settings = serverEnv.aiModeration;
  const classifier = await classifierFor(input.reportedId);
  const result = await screenText(input.excerpt, {
    classifier,
    timeoutMs: settings.timeoutMs,
  });
  if (result.fallback) console.warn("[moderation] model unavailable, used regex:", result.fallback);
  if (isSevere(result.flags)) {
    await fileAutoReport({ ...input, flags: result.flags });
    return;
  }
  const reason = modelReportReason(result.verdict, settings.threshold);
  if (reason && result.verdict) await fileModelReport(input, reason, result.verdict);
}

/**
 * The model reads message text only when this deployment turned it on and has a key, and
 * the sender's school opted in (Staff → Safety settings). Otherwise: regex only.
 */
async function classifierFor(senderId: string): Promise<Classifier | null> {
  const settings = serverEnv.aiModeration;
  if (!settings.enabled || !settings.apiKey) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("schools(ai_moderation_enabled)")
    .eq("id", senderId)
    .maybeSingle();
  const school = data?.schools as { ai_moderation_enabled: boolean } | null | undefined;
  if (!school?.ai_moderation_enabled) return null;
  return claudeClassifier(client(), settings.model);
}

let anthropic: Anthropic | null = null;
function client() {
  const settings = serverEnv.aiModeration;
  anthropic ??= new Anthropic({ apiKey: settings.apiKey, baseURL: settings.baseURL });
  return anthropic;
}

export async function fileAutoReport(input: Where & { flags: ModerationFlag[] }) {
  if (!isSevere(input.flags)) return;
  await insertAutoReport(input, {
    reason: input.flags.includes("abuse") ? "harassment" : "scam",
    details: `Automatic flag: ${input.flags.join(", ")}`,
    classifier: "regex",
    confidence: null,
    meta: { flags: input.flags },
  });
}

async function fileModelReport(
  input: Where,
  reason: "harassment" | "safety" | "scam",
  verdict: ModelVerdict,
) {
  await insertAutoReport(input, {
    reason,
    details: `Automatic flag (AI screening): likely ${verdict.category}, ${Math.round(verdict.confidence * 100)}% confidence. Needs a person to review.`,
    classifier: "model",
    confidence: verdict.confidence,
    meta: { category: verdict.category },
  });
}

async function insertAutoReport(
  input: Where,
  report: {
    reason: "harassment" | "safety" | "scam";
    details: string;
    classifier: "regex" | "model";
    confidence: number | null;
    meta: { flags: ModerationFlag[] } | { category: ModelVerdict["category"] };
  },
) {
  const admin = createAdminClient();
  const [{ data }, { data: sender }] = await Promise.all([
    admin
      .from("reports")
      .insert({
        reporter_id: null,
        reported_id: input.reportedId,
        reason: report.reason,
        details: report.details,
        source: "auto",
        context: {
          excerpt: input.excerpt.slice(0, 500),
          conversation_id: input.conversationId ?? null,
          message_id: input.messageId ?? null,
          intro_id: input.introId ?? null,
        },
      })
      .select("id")
      .single(),
    admin.from("profiles").select("school_id").eq("id", input.reportedId).maybeSingle(),
  ]);
  await admin.from("moderation_log").insert({
    actor_id: null,
    action: "auto_flag",
    target_id: input.reportedId,
    report_id: data?.id ?? null,
    classifier: report.classifier,
    confidence: report.confidence,
    meta: { ...report.meta, school_id: sender?.school_id ?? null },
  });
  await forwardToWebhook({
    kind: "auto",
    reportId: data?.id,
    classifier: report.classifier,
    ...report.meta,
    ...(report.confidence === null ? {} : { confidence: report.confidence }),
    excerpt: input.excerpt,
  });
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
