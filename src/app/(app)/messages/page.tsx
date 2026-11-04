import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadConversations } from "@/lib/messages";
import { loadRequests } from "@/lib/requests";
import { Inbox } from "@/components/chat/inbox";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("chat"))("title") };
}
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getUser();
  const supabase = createClient();
  const [conversations, requests] = await Promise.all([
    loadConversations(supabase, user!.id),
    loadRequests(supabase, user!.id),
  ]);
  return <Inbox userId={user!.id} conversations={conversations} requests={requests} />;
}
