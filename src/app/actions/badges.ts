"use server";

import { createClient, getUser } from "@/lib/supabase/server";

export interface BadgeCounts {
  /** Conversations with unread messages + pending intros & group invites. */
  messages: number;
  /** Unread notifications. */
  notifications: number;
  /** Pending requests to join the viewer's group. */
  groups: number;
}

export async function getBadgeCounts(): Promise<BadgeCounts> {
  const user = await getUser();
  if (!user) return { messages: 0, notifications: 0, groups: 0 };
  const supabase = createClient();

  const [unread, intros, invites, notifications, joinRequests] = await Promise.all([
    supabase.rpc("unread_counts"),
    supabase
      .from("intros")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("group_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "invite")
      .eq("status", "pending"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("group_requests")
      .select("id", { count: "exact", head: true })
      .eq("kind", "request")
      .eq("status", "pending")
      .neq("user_id", user.id),
  ]);

  const unreadConversations = (unread.data ?? []).filter((row) => row.unread > 0).length;
  return {
    messages: unreadConversations + (intros.count ?? 0) + (invites.count ?? 0),
    notifications: notifications.count ?? 0,
    groups: joinRequests.count ?? 0,
  };
}
