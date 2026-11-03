import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { runRetention } from "@/lib/retention/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Data retention. Runs nightly inside /api/cron/recompute; this route is for manual runs. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ schools: await runRetention() });
  } catch (error) {
    console.error("[cron:retention] failed", error);
    return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  }
}
