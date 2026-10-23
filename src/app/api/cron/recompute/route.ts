import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { isAuthorizedCron } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Repair job: re-scores anyone whose preferences changed after their scores were
 * computed (e.g. a background recompute was interrupted). Normal edits re-rank
 * immediately; this only catches stragglers.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const started = Date.now();
  const { data, error } = await createAdminClient().rpc("stale_match_users", { p_limit: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let failed = 0;
  for (const row of data ?? []) {
    if (Date.now() - started > 50_000) break; // leave headroom under maxDuration
    try {
      await recomputeMatchesFor(row.user_id);
      processed += 1;
    } catch (err) {
      failed += 1;
      console.error("[cron:recompute] failed for", row.user_id, err);
    }
  }
  return NextResponse.json({ stale: data?.length ?? 0, processed, failed, ms: Date.now() - started });
}
