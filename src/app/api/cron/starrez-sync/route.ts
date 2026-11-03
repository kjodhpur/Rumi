import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron";
import { getHousingAdapter } from "@/lib/integrations/starrez/adapter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly StarRez synchronization cron:
 * For each school with an active StarRez integration, pulls assignments and room changes.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  // Find schools with active StarRez integration
  const { data: configs, error: configError } = await db
    .from("integration_credentials")
    .select("school_id")
    .eq("provider", "starrez")
    .eq("active", true);

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const results: { schoolId: string; assignments: number; roomChanges: number; status: string }[] = [];

  for (const config of configs ?? []) {
    try {
      const adapter = getHousingAdapter(config.school_id, "starrez");
      const [assignments, roomChanges] = await Promise.all([
        adapter.pullAssignments(config.school_id),
        adapter.pullRoomChanges(config.school_id),
      ]);

      results.push({
        schoolId: config.school_id,
        assignments: assignments.length,
        roomChanges: roomChanges.length,
        status: "synced",
      });
    } catch (err: unknown) {
      results.push({
        schoolId: config.school_id,
        assignments: 0,
        roomChanges: 0,
        status: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return NextResponse.json({ ok: true, syncedSchools: results.length, details: results });
}
