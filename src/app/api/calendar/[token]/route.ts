import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken } from "@/lib/share/token";
import { generateIcsFeed } from "@/lib/calendar/ics";
import type { CalendarEvent } from "@/lib/calendar/conflicts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } },
) {
  const resolved = await Promise.resolve(params);
  let token = resolved?.token;
  if (token && token.endsWith(".ics")) {
    token = token.slice(0, -4);
  }

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const supabase = createAdminClient();
  const tokenHash = hashShareToken(token);

  const { data: calToken, error: tokenError } = await supabase
    .from("room_calendar_tokens")
    .select("group_id, user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError || !calToken) {
    return new Response("Calendar feed not found", { status: 404 });
  }

  // Load room events
  const { data: eventsData, error: eventsError } = await supabase
    .from("room_events")
    .select("id, kind, title, starts_at, ends_at, overnight, guest_count, notes")
    .eq("group_id", calToken.group_id)
    .order("starts_at", { ascending: true });

  if (eventsError) {
    return new Response("Failed to load events", { status: 500 });
  }

  const events: (CalendarEvent & { notes?: string | null })[] = (eventsData || []).map(
    (e) => ({
      id: e.id,
      kind: e.kind as CalendarEvent["kind"],
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      overnight: e.overnight,
      guestCount: e.guest_count,
      notes: e.notes,
    }),
  );

  const icsBody = generateIcsFeed("Rumi Room Calendar", events);

  return new Response(icsBody, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="room-calendar.ics"',
      "Cache-Control": "private, max-age=300, must-revalidate",
    },
  });
}
