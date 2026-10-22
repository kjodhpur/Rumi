import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadThread } from "@/lib/messages";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = await getUser();
  const thread = await loadThread(createClient(), user!.id, params.id);
  if (!thread) notFound();
  return <ChatThread userId={user!.id} thread={thread} />;
}
