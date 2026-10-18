import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserSpotify } from "@/lib/spotify";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections } = await admin.from("spotify_connections").select("user_id");
  let ok = 0;
  let failed = 0;
  for (const row of connections ?? []) {
    try {
      await syncUserSpotify(row.user_id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ refreshed: ok, failed });
}
