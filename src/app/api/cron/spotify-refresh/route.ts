import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTaste } from "@/lib/spotify";
import { recomputeMatchesFor } from "@/lib/matching/recompute";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly Spotify taste refresher.
 * Queries accounts not synced within the last 7 days and pulls updated top artists/genres.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Find accounts that need refresh (older than 7 days or never synced)
  const { data: accounts, error } = await admin
    .from("spotify_accounts")
    .select("user_id, last_synced_at")
    .or(`last_synced_at.is.null,last_synced_at.lt.${weekAgo}`)
    .limit(50);

  if (error || !accounts) {
    return NextResponse.json({ error: "failed_to_fetch_accounts" }, { status: 500 });
  }

  let refreshed = 0;
  let failed = 0;

  for (const acc of accounts) {
    try {
      const ok = await syncTaste(acc.user_id);
      if (ok) {
        refreshed++;
        await recomputeMatchesFor(acc.user_id).catch(() => {});
      } else {
        failed++;
      }
    } catch (err) {
      console.warn(`[cron:spotify-refresh] Failed for user ${acc.user_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    checked: accounts.length,
    refreshed,
    failed,
    timestamp: new Date().toISOString(),
  });
}
