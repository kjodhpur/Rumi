import type { ServerSupabase } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";

export interface ChatMember {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
  lastReadAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string | null;
  kind: "text" | "system";
  body: string;
  createdAt: string;
  clientId: string | null;
  /** Client-only states for optimistic sends. */
  status?: "sending" | "failed";
}

export interface ConversationSummary {
  id: string;
  kind: "direct" | "group";
  title: string;
  members: ChatMember[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageMine: boolean;
  unread: number;
  groupId: string | null;
}

const PAGE = 50;

/** Conversation list for the inbox, newest activity first. */
export async function loadConversations(supabase: ServerSupabase, userId: string): Promise<ConversationSummary[]> {
  const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
  const ids = (mine ?? []).map((m) => m.conversation_id);
  if (ids.length === 0) return [];

  const [{ data: conversations }, { data: members }, { data: unread }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, kind, group_id, last_message_at, last_message_preview, last_message_sender_id, created_at, groups(name)")
      .in("id", ids),
    supabase
      .from("conversation_members")
      .select("conversation_id, user_id, last_read_at, profiles(first_name, last_initial, avatar_path)")
      .in("conversation_id", ids),
    supabase.rpc("unread_counts"),
  ]);

  const unreadBy = new Map((unread ?? []).map((u) => [u.conversation_id, u.unread]));
  const membersBy = new Map<string, ChatMember[]>();
  for (const m of members ?? []) {
    const p = m.profiles as unknown as { first_name: string; last_initial: string; avatar_path: string | null } | null;
    const list = membersBy.get(m.conversation_id) ?? [];
    list.push({
      id: m.user_id,
      firstName: p?.first_name ?? "Former member",
      lastInitial: p?.last_initial ?? "",
      avatarUrl: photoUrl(p?.avatar_path),
      lastReadAt: m.last_read_at,
    });
    membersBy.set(m.conversation_id, list);
  }

  return (conversations ?? [])
    .map((c) => {
      const all = membersBy.get(c.id) ?? [];
      const others = all.filter((m) => m.id !== userId);
      const groupName = (c.groups as unknown as { name: string } | null)?.name;
      return {
        id: c.id,
        kind: c.kind as "direct" | "group",
        title: c.kind === "group" ? (groupName ?? "Group") : others[0] ? `${others[0].firstName} ${others[0].lastInitial ? `${others[0].lastInitial}.` : ""}`.trim() : "Conversation",
        members: others,
        lastMessageAt: c.last_message_at ?? c.created_at,
        lastMessagePreview: c.last_message_preview,
        lastMessageMine: c.last_message_sender_id === userId,
        unread: unreadBy.get(c.id) ?? 0,
        groupId: c.group_id,
      };
    })
    .sort((a, b) => Date.parse(b.lastMessageAt ?? "0") - Date.parse(a.lastMessageAt ?? "0"));
}

export async function loadThread(supabase: ServerSupabase, userId: string, conversationId: string) {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, kind, group_id, groups(name, target_size)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("user_id, last_read_at, profiles(first_name, last_initial, avatar_path)")
      .eq("conversation_id", conversationId),
    supabase
      .from("messages")
      .select("id, sender_id, kind, body, created_at, client_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(PAGE),
  ]);

  const chatMembers: ChatMember[] = (members ?? []).map((m) => {
    const p = m.profiles as unknown as { first_name: string; last_initial: string; avatar_path: string | null } | null;
    return {
      id: m.user_id,
      firstName: p?.first_name ?? "Former member",
      lastInitial: p?.last_initial ?? "",
      avatarUrl: photoUrl(p?.avatar_path),
      lastReadAt: m.last_read_at,
    };
  });
  const others = chatMembers.filter((m) => m.id !== userId);
  const group = conversation.groups as unknown as { name: string; target_size: number } | null;

  // In a direct chat, a block on either side closes the thread.
  let blocked = false;
  if (conversation.kind === "direct" && others[0]) {
    const { data } = await supabase.rpc("is_blocked", { a: userId, b: others[0].id });
    blocked = Boolean(data);
  }

  return {
    id: conversation.id,
    kind: conversation.kind as "direct" | "group",
    groupId: conversation.group_id,
    title: conversation.kind === "group" ? (group?.name ?? "Group") : others[0] ? `${others[0].firstName} ${others[0].lastInitial}.` : "Conversation",
    members: chatMembers,
    messages: (messages ?? []).reverse().map(toChatMessage),
    hasMore: (messages ?? []).length === PAGE,
    blocked,
  };
}

export function toChatMessage(row: {
  id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  created_at: string;
  client_id: string | null;
}): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    kind: row.kind as ChatMessage["kind"],
    body: row.body,
    createdAt: row.created_at,
    clientId: row.client_id,
  };
}

export const MESSAGE_PAGE = PAGE;
