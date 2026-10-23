import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";
import { NotificationList, type NotificationItem } from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, read_at, created_at, actor_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const actorIds = [...new Set((data ?? []).map((n) => n.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, first_name, last_initial, avatar_path").in("id", actorIds)
    : { data: [] as { id: string; first_name: string; last_initial: string; avatar_path: string | null }[] };
  const actorBy = new Map((actors ?? []).map((a) => [a.id, a]));

  const items: NotificationItem[] = (data ?? []).map((n) => {
    const actor = n.actor_id ? actorBy.get(n.actor_id) : undefined;
    return {
      id: n.id,
      type: n.type as NotificationItem["type"],
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.read_at,
      createdAt: n.created_at,
      actor: actor ? { firstName: actor.first_name, lastInitial: actor.last_initial, avatarUrl: photoUrl(actor.avatar_path) } : null,
    };
  });

  return <NotificationList items={items} />;
}
