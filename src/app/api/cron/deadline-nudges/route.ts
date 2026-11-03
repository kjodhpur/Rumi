import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { runDeadlineNudges } from "@/lib/notifications/deadline-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily at 10am campus time (17:00 UTC for Arizona): deadline nudges. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runDeadlineNudges());
}
