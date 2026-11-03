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
  staffInvitesPerDay: { max: 50, window: 86400 },
  consentChangesPerHour: { max: 30, window: 3600 },
  nudgeCampaignsPerDay: { max: 10, window: 86400 },
  autoPairRunsPerHour: { max: 20, window: 3600 },
  suggestionResponsesPerHour: { max: 30, window: 3600 },
  staffExportsPerHour: { max: 30, window: 3600 },
  studentIdChangesPerHour: { max: 10, window: 3600 },
  agreementEditsPerHour: { max: 120, window: 3600 },
  checkinsPerDay: { max: 10, window: 86400 },
  escalationsPerDay: { max: 10, window: 86400 },
  shareLinksPerHour: { max: 20, window: 3600 },
  familyLinksPerHour: { max: 10, window: 3600 },
  roomCalendarWritesPerHour: { max: 60, window: 3600 },
  roomHubWritesPerHour: { max: 120, window: 3600 },
  connectionRequestsPerDay: { max: 20, window: 86400 },
  socialLinkChangesPerHour: { max: 20, window: 3600 },
  mediaUploadsPerHour: { max: 10, window: 3600 },
  mediaReportsPerDay: { max: 20, window: 86400 },
  scenarioAnswersPerHour: { max: 120, window: 3600 },
  preferenceFlagsPerHour: { max: 60, window: 3600 },
  roomChangeRequestsPerDay: { max: 5, window: 86400 },
  swapActionsPerHour: { max: 30, window: 3600 },
  surveyAnswersPerHour: { max: 20, window: 3600 },
  carryForwardPerHour: { max: 20, window: 3600 },
  agreementCommentsPerHour: { max: 60, window: 3600 },
  notificationPrefsPerHour: { max: 60, window: 3600 },
  pushSubscriptionsPerHour: { max: 10, window: 3600 },
  phoneVerificationsPerHour: { max: 5, window: 3600 },
  calendarConnectsPerHour: { max: 10, window: 3600 },
  classScheduleChangesPerHour: { max: 30, window: 3600 },
  localeChangesPerHour: { max: 30, window: 3600 },
  importedAnswersPerHour: { max: 20, window: 3600 },
  linkVisitsPerHour: { max: 120, window: 3600 },
  staffWritesPerHour: { max: 300, window: 3600 },
  staffImportsPerHour: { max: 20, window: 3600 },
  integrationCallsPerHour: { max: 30, window: 3600 },
  raWritesPerHour: { max: 200, window: 3600 },
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
