import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Limits used across the app (count per window, in seconds). */
export const LIMITS = {
  otpPerEmail: { max: 5, window: 3600 },
  otpPerIp: { max: 20, window: 3600 },
  verifyPerEmail: { max: 10, window: 900 },
  messagesPerMinute: { max: 20, window: 60 },
  messagesPerDay: { max: 600, window: 86400 },
  introsPerDay: { max: 20, window: 86400 },
  reportsPerDay: { max: 10, window: 86400 },
  groupInvitesPerDay: { max: 20, window: 86400 },
} as const;

/**
 * Fixed-window rate limit backed by Postgres (works on serverless without Redis).
 * Fails open if the database is unreachable — Supabase's own auth limits still apply.
 */
export async function rateLimit(key: string, limit: { max: number; window: number }) {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit", {
      p_key: key,
      p_max: limit.max,
      p_window_seconds: limit.window,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("[rate-limit] check failed", error);
    return true;
  }
}

export function clientIp() {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
