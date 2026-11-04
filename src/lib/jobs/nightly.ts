import "server-only";
import { runRetention } from "@/lib/retention/run";
import { sendSurveyInvites } from "@/lib/retention/survey-invites";
import { runLivingReminders } from "@/lib/checkins/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Jobs that ride along with the nightly recompute cron. Vercel plans cap the number
 * of cron entries, so new nightly work registers here instead of in vercel.json.
 * Each job also has its own route under /api/cron for manual runs.
 */
const JOBS: { name: string; run: () => Promise<unknown> }[] = [
  { name: "retention", run: () => runRetention() },
  { name: "survey-invites", run: () => sendSurveyInvites() },
  { name: "living-reminders", run: () => runLivingReminders() },
  { name: "segment-snapshot", run: () => snapshotSegments() },
];

/** 1.A: freeze each school's segment numbers for the active term (kept for the term report). */
async function snapshotSegments() {
  const db = createAdminClient();
  const { data: terms } = await db.from("terms").select("school_id").eq("active", true);
  const out: Record<string, number> = {};
  for (const t of terms ?? []) {
    const { data, error } = await db.rpc("refresh_segment_metrics", { p_school: t.school_id });
    if (error) throw error;
    out[t.school_id] = data ?? 0;
  }
  return out;
}

export async function runNightlyJobs() {
  const results: Record<string, unknown> = {};
  for (const job of JOBS) {
    try {
      results[job.name] = await job.run();
    } catch (error) {
      console.error(`[cron:nightly] ${job.name} failed`, error);
      results[job.name] = { error: error instanceof Error ? error.message : "failed" };
    }
  }
  return results;
}
