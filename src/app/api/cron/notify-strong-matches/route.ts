import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRONG_THRESHOLD = 85;

/** Nightly: notify users of new strong matches in the last 24h. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const { data: strong } = await admin
    .from("match_cache")
    .select("user_id, other_id, score")
    .gte("score", STRONG_THRESHOLD)
    .gte("computed_at", since)
    .order("score", { ascending: false })
    .limit(500);

  const byUser = new Map<string, Array<{ other_id: string; score: number }>>();
  for (const row of strong ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ other_id: row.other_id, score: Number(row.score) });
    byUser.set(row.user_id, list);
  }

  let created = 0;
  for (const [userId, matches] of byUser) {
    const top = matches.slice(0, 3);
    const title = top.length === 1 ? "New strong match" : `${top.length} new strong matches`;
    const body = top.map((m) => `${Math.round(m.score)}% match`).join(" · ");
    try {
      await notifyUser({
        userId,
        type: "strong_match",
        title,
        body,
        href: "/matches",
        meta: { matches: top },
        emailSubject: `Rumi: ${title}`,
      });
      created += 1;
    } catch {
      /* continue */
    }
  }

  return NextResponse.json({ ok: true, created, users: byUser.size });
}
