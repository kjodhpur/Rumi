import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken, isTokenShaped } from "@/lib/share/token";
import { generateIcsFeed } from "@/lib/calendar/ics";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * A member's private .ics feed (/api/calendar/<token> or <token>.ics). The token is checked
 * by hash; the member must still be in the group, so leaving the room ends the feed.
 */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/, "");
  if (!isTokenShaped(token)) return NOT_FOUND();
  if (
    !(await rateLimit(
      `calendar-feed:${hashShareToken(token).slice(0, 16)}`,
      LIMITS.linkVisitsPerHour,
    ))
  ) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": "3600" } });
  }

  const db = createAdminClient();
  const { data: feed } = await db
    .from("room_calendar_tokens")
    .select("group_id, user_id")
    .eq("token_hash", hashShareToken(token))
    .maybeSingle();
  if (!feed) return NOT_FOUND();
  const { data: member } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", feed.group_id)
    .eq("user_id", feed.user_id)
    .maybeSingle();
  if (!member) return NOT_FOUND();

  const [{ data: group }, { data: events }, { data: people }] = await Promise.all([
    db.from("groups").select("name").eq("id", feed.group_id).maybeSingle(),
    db
      .from("room_events")
      .select(
        "id, kind, title, starts_at, ends_at, overnight, guest_count, rrule, notes, created_by",
      )
      .eq("group_id", feed.group_id)
      .gte("ends_at", new Date(Date.now() - 90 * 86_400_000).toISOString())
      .order("starts_at")
      .limit(500),
    db.from("group_members").select("user_id, profiles(first_name)").eq("group_id", feed.group_id),
  ]);
  const names = new Map(
    (people ?? []).map((p) => [
      p.user_id,
      (p.profiles as { first_name: string } | null)?.first_name ?? null,
    ]),
  );

  const body = generateIcsFeed(
    `${group?.name ?? "Room"} · Rumi`,
    (events ?? []).map((e) => ({
      id: e.id,
      kind: e.kind as "guest" | "quiet" | "away" | "shared",
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      overnight: e.overnight,
      guestCount: e.guest_count,
      rrule: e.rrule,
      notes: e.notes,
      createdByName: names.get(e.created_by) ?? null,
    })),
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="room-calendar.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
