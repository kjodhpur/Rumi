import "server-only";
import { runRetention } from "@/lib/retention/run";

/**
 * Jobs that ride along with the nightly recompute cron. Vercel plans cap the number
 * of cron entries, so new nightly work registers here instead of in vercel.json.
 * Each job also has its own route under /api/cron for manual runs.
 */
const JOBS: { name: string; run: () => Promise<unknown> }[] = [{ name: "retention", run: () => runRetention() }];

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
