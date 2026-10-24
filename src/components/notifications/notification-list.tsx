"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCheck, Heart, MessageCircle, Send, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { useLive } from "@/components/realtime/live-provider";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import { revealDelay } from "@/lib/motion";
import { useEntrance } from "@/hooks/use-entrance";

export interface NotificationItem {
  id: string;
  type: "intro_received" | "intro_accepted" | "message" | "strong_match" | "group_invite" | "group_request" | "group_joined";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { firstName: string; lastInitial: string; avatarUrl: string | null } | null;
}

const TYPE_ICON = {
  intro_received: Send,
  intro_accepted: Heart,
  message: MessageCircle,
  strong_match: Sparkles,
  group_invite: Users,
  group_request: Users,
  group_joined: Users,
} as const;

export function NotificationList({ items: initial }: { items: NotificationItem[] }) {
  const entrance = useEntrance(initial.map((item) => item.id));
  const router = useRouter();
  const { refresh, counts } = useLive();
  const [items, setItems] = React.useState(initial);
  React.useEffect(() => setItems(initial), [initial]);

  // New notifications arrive over Realtime — re-read the list when the count moves.
  const lastCount = React.useRef(counts.notifications);
  React.useEffect(() => {
    if (counts.notifications > lastCount.current) router.refresh();
    lastCount.current = counts.notifications;
  }, [counts.notifications, router]);

  const unread = items.filter((n) => !n.readAt).length;

  async function open(item: NotificationItem) {
    if (!item.readAt) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
      void markNotificationRead(item.id).then(refresh);
    }
    if (item.href) router.push(item.href);
  }

  async function markAll() {
    const previous = items;
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    const result = await markAllNotificationsRead();
    if (!result.ok) {
      setItems(previous);
      toast.error(result.error);
      return;
    }
    refresh();
  }

  const today: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  for (const item of items) {
    (Date.now() - Date.parse(item.createdAt) < 86_400_000 ? today : earlier).push(item);
  }

  return (
    <div className="mx-auto max-w-[680px]">
      <PageHeader
        title="Notifications"
        description="Intros, new strong matches, messages and group activity."
        actions={
          unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => void markAll()}>
              <CheckCheck /> Mark all read
            </Button>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Bell strokeWidth={1.5} />}
          title="You're all caught up"
          description="We'll let you know when someone sends an intro, a strong match joins, or your group changes."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {[
            ["Today", today],
            ["Earlier", earlier],
          ].map(([label, list]) =>
            (list as NotificationItem[]).length ? (
              <section key={label as string}>
                <h2 className="mb-2 text-caption font-semibold tracking-wide text-ink-3 uppercase">{label as string}</h2>
                <ul className="-mx-2 flex flex-col">
                  {(list as NotificationItem[]).map((item, i) => {
                    const Icon = TYPE_ICON[item.type] ?? Bell;
                    return (
                      <li key={item.id} className={entrance(item.id)} style={revealDelay(i)}>
                        <button
                          type="button"
                          onClick={() => void open(item)}
                          className="flex w-full items-start gap-3.5 rounded-lg px-2 py-3 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <span className="relative shrink-0">
                            {item.actor ? (
                              <Avatar src={item.actor.avatarUrl} firstName={item.actor.firstName} lastInitial={item.actor.lastInitial} size={44} />
                            ) : (
                              <span className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                              </span>
                            )}
                            {item.actor ? (
                              <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface text-ink ring-2 ring-bg">
                                <Icon className={cn("size-3", item.type === "strong_match" && "text-accent")} strokeWidth={2.25} aria-hidden />
                              </span>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-body-sm", item.readAt ? "text-ink" : "font-semibold text-ink")}>{item.title}</span>
                            {item.body ? <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-2">{item.body}</span> : null}
                            <RelativeTime iso={item.createdAt} className="mt-1 block text-caption text-ink-3" />
                          </span>
                          {!item.readAt ? (
                            <span className="mt-2 size-2 shrink-0 rounded-full bg-accent">
                              <span className="sr-only">Unread</span>
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
