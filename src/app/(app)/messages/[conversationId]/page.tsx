import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/chat/chat-thread";
import { displayName } from "@/lib/utils";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: part } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!part) notFound();

  const { data: otherPart } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", params.conversationId)
    .neq("user_id", user!.id)
    .maybeSingle();

  const { data: other } = otherPart
    ? await supabase
        .from("profiles")
        .select("first_name, last_initial")
        .eq("id", otherPart.user_id)
        .maybeSingle()
    : { data: null };

  const { data: messages } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="text-sm text-asu-maroon">
          ← Inbox
        </Link>
        <h1 className="font-display text-2xl font-semibold text-asu-maroon">
          {other ? displayName(other.first_name, other.last_initial) : "Chat"}
        </h1>
      </div>
      <ChatThread
        conversationId={params.conversationId}
        userId={user!.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
