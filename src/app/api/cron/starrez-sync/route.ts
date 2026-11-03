import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";
import { runRest } from "@/lib/integrations/starrez/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly, for schools that turned on StarRez sync: pull assignments and room changes since
 * the last good run. Each run is logged in integration_runs, partial failures included.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: schools, error } = await createAdminClient().from("integration_credentials").select("school_id").eq("provider", "starrez").eq("sync_enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const started = Date.now();
  const results: { schoolId: string; assignments: string; roomChanges: string }[] = [];
  for (const { school_id } of schools ?? []) {
    if (Date.now() - started > 50_000) break;
    const assignments = await runRest(school_id, "pull_assignments", null);
    const roomChanges = await runRest(school_id, "pull_room_changes", null);
    results.push({ schoolId: school_id, assignments: assignments.status, roomChanges: roomChanges.status });
  }
  return NextResponse.json({ schools: results.length, results });
}
