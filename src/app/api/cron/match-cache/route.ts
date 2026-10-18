import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeMatchCache } from "@/lib/matches-service";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("onboarding_complete", true)
    .eq("paused", false)
    .eq("suspended", false);

  let ok = 0;
  let failed = 0;
  for (const p of profiles ?? []) {
    try {
      await recomputeMatchCache(p.id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ recomputed: ok, failed });
}
