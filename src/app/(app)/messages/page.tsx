import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { displayName } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user!.id);

  if (!parts?.length) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">Messages</h1>
        <EmptyState
          title="No conversations yet"
          description="Message someone from their profile to start chatting."
        />
      </div>
    );
  }

  const convIds = parts.map((p) => p.conversation_id);
  const { data: others } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", user!.id);

  const otherIds = Array.from(new Set((others ?? []).map((o) => o.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const otherByConv = new Map((others ?? []).map((o) => [o.conversation_id, o.user_id]));

  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  const rows = await Promise.all(
    (convs ?? []).map(async (c) => {
      const { data: last } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const part = parts.find((p) => p.conversation_id === c.id);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", user!.id)
        .gt("created_at", part?.last_read_at ?? "1970-01-01");
      const otherId = otherByConv.get(c.id);
      const profile = otherId ? profileMap.get(otherId) : null;
      return { c, last, unread: count ?? 0, profile };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">Messages</h1>
      <ul className="divide-y divide-rumi-sand rounded-2xl border border-rumi-sand bg-white">
        {rows.map(({ c, last, unread, profile }) => (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-rumi-cream/60"
            >
              <div>
                <p className="font-semibold">
                  {profile
                    ? displayName(profile.first_name, profile.last_initial)
                    : "Conversation"}
                </p>
                <p className="line-clamp-1 text-sm text-rumi-muted">{last?.body ?? "No messages"}</p>
              </div>
              {unread > 0 ? (
                <span className="rounded-full bg-asu-maroon px-2 py-0.5 text-xs text-white">
                  {unread}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
