import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadThread } from "@/lib/messages";
import { loadStarters } from "@/lib/starters";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = await getUser();
  const supabase = createClient();
  const thread = await loadThread(supabase, user!.id, params.id);
  if (!thread) notFound();
  const others = thread.members.filter((m) => m.id !== user!.id);
  // Starters fit one-to-one conversations: direct chats and two-person groups (housing pairs).
  const starters = others.length === 1 && !thread.blocked ? await loadStarters(supabase, user!.id, others[0].id) : [];
  return <ChatThread userId={user!.id} thread={thread} starters={starters} />;
}
