import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { photoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

/**
 * Everything Rumi stores about the signed-in student, as one JSON download.
 * Other people's messages are included only where they're part of a chat with you;
 * reports filed about you and third-party tokens are never exported.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your data." }, { status: 401 });
  if (!(await rateLimit(`export:${user.id}`, { max: 5, window: 3600 }))) {
    return NextResponse.json({ error: "Too many exports. Try again in an hour." }, { status: 429 });
  }

  const db = createAdminClient();
  const id = user.id;
  const [
    profile,
    settings,
    preferences,
    photos,
    spotify,
    music,
    matches,
    saves,
    blocks,
    introsSent,
    introsReceived,
    groupMembership,
    groupRequests,
    memberships,
    notifications,
    reportsFiled,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).single(),
    db.from("user_settings").select("*").eq("user_id", id).single(),
    db.from("preferences").select("*").eq("user_id", id).single(),
    db.from("photos").select("id, storage_path, position, width, height, created_at").eq("user_id", id).order("position"),
    db.from("spotify_accounts").select("spotify_user_id, display_name, scopes, connected_at, last_synced_at").eq("user_id", id).maybeSingle(),
    db.from("music_profiles").select("top_artists, top_genres, synced_at").eq("user_id", id).maybeSingle(),
    db.from("match_scores").select("candidate_id, score, reasons, watchouts, breakdown, computed_at").eq("viewer_id", id).order("score", { ascending: false }),
    db.from("saves").select("target_id, created_at").eq("user_id", id),
    db.from("blocks").select("blocked_id, created_at").eq("blocker_id", id),
    db.from("intros").select("*").eq("sender_id", id),
    db.from("intros").select("*").eq("recipient_id", id),
    db.from("group_members").select("group_id, role, joined_at, groups(*)").eq("user_id", id),
    db.from("group_requests").select("*").or(`user_id.eq.${id},created_by.eq.${id}`),
    db.from("conversation_members").select("conversation_id, joined_at, last_read_at, conversations(kind, group_id, created_at)").eq("user_id", id),
    db.from("notifications").select("type, title, body, href, read_at, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("reports").select("reported_id, reason, details, status, created_at").eq("reporter_id", id).eq("source", "user"),
  ]);

  const conversationIds = (memberships.data ?? []).map((m) => m.conversation_id);
  const { data: messages } = conversationIds.length
    ? await db
        .from("messages")
        .select("conversation_id, sender_id, kind, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at")
    : { data: [] };

  const body = {
    exported_at: new Date().toISOString(),
    account: { id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
    profile: profile.data,
    settings: settings.data,
    preferences: preferences.data,
    photos: (photos.data ?? []).map((p) => ({ ...p, url: photoUrl(p.storage_path) })),
    spotify: spotify.data,
    music: music.data,
    matches: matches.data ?? [],
    saved_profiles: saves.data ?? [],
    blocked_profiles: blocks.data ?? [],
    intros: { sent: introsSent.data ?? [], received: introsReceived.data ?? [] },
    groups: { memberships: groupMembership.data ?? [], requests: groupRequests.data ?? [] },
    conversations: (memberships.data ?? []).map((m) => ({
      ...m,
      messages: (messages ?? []).filter((msg) => msg.conversation_id === m.conversation_id).map(({ conversation_id: _c, ...msg }) => ({
        ...msg,
        from_you: msg.sender_id === id,
      })),
    })),
    notifications: notifications.data ?? [],
    reports_filed: reportsFiled.data ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
