import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { strongMatchDigestEmail } from "@/lib/email/templates";
import { STRONG_MATCH_THRESHOLD } from "@/lib/matching/engine";
import { selectAll, selectByIds } from "@/lib/supabase/paginate";
import { isAuthorizedCron } from "@/lib/cron";
import { isSelectableLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily email: strong matches that appeared since each student's last digest.
 * In-app notifications fire instantly; email waits for this one daily summary.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  let rows: {
    viewer_id: string;
    candidate_id: string;
    score: number;
    notified_at: string | null;
  }[];
  try {
    rows = await selectAll((from, to) =>
      db
        .from("match_scores")
        .select("viewer_id, candidate_id, score, notified_at")
        .gte("score", STRONG_MATCH_THRESHOLD)
        .gte("notified_at", since)
        .order("viewer_id")
        .order("candidate_id")
        .range(from, to),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    );
  }
  if (!rows.length) return NextResponse.json({ recipients: 0, sent: 0 });
  rows.sort((a, b) => b.score - a.score);

  const viewerIds = [...new Set(rows.map((r) => r.viewer_id))];
  const candidateIds = [...new Set(rows.map((r) => r.candidate_id))];
  const [settings, viewers, candidates] = await Promise.all([
    selectByIds(viewerIds, (c, f, t) =>
      db
        .from("user_settings")
        .select("user_id, email, locale, notify_email_matches, last_digest_at")
        .in("user_id", c)
        .order("user_id")
        .range(f, t),
    ),
    selectByIds(viewerIds, (c, f, t) =>
      db.from("profiles").select("id, first_name, banned_at").in("id", c).order("id").range(f, t),
    ),
    selectByIds(candidateIds, (c, f, t) =>
      db
        .from("profiles")
        .select(
          "id, first_name, last_initial, banned_at, is_hidden, is_seed, schools(hide_seed_profiles)",
        )
        .in("id", c)
        .order("id")
        .range(f, t),
    ),
  ]);
  const settingsBy = new Map((settings ?? []).map((s) => [s.user_id, s]));
  const viewerBy = new Map((viewers ?? []).map((v) => [v.id, v]));
  const visible = new Map(
    (candidates ?? [])
      .filter((c) => !c.banned_at && !c.is_hidden && !(c.is_seed && c.schools?.hide_seed_profiles))
      .map((c) => [c.id, `${c.first_name} ${c.last_initial}.`]),
  );

  let sent = 0;
  let recipients = 0;
  const now = new Date().toISOString();
  for (const viewerId of viewerIds) {
    const prefs = settingsBy.get(viewerId);
    const viewer = viewerBy.get(viewerId);
    if (!prefs?.notify_email_matches || !viewer || viewer.banned_at) continue;
    const cutoff = prefs.last_digest_at ? Date.parse(prefs.last_digest_at) : 0;
    const fresh = rows.filter(
      (r) =>
        r.viewer_id === viewerId &&
        r.notified_at &&
        Date.parse(r.notified_at) > cutoff &&
        visible.has(r.candidate_id),
    );
    if (fresh.length === 0) continue;
    recipients += 1;
    const email = strongMatchDigestEmail(
      viewer.first_name,
      fresh.map((r) => ({
        id: r.candidate_id,
        name: visible.get(r.candidate_id)!,
        score: r.score,
      })),
      isSelectableLocale(prefs.locale) ? prefs.locale : "en",
    );
    const delivered = await sendEmail({
      to: prefs.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (delivered) sent += 1;
    await db.from("user_settings").update({ last_digest_at: now }).eq("user_id", viewerId);
  }
  return NextResponse.json({ recipients, sent });
}
