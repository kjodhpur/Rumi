"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { whenIdle } from "@/lib/idle";
import { getBadgeCounts, type BadgeCounts } from "@/app/actions/badges";

interface LiveContextValue {
  counts: BadgeCounts;
  refresh: () => void;
  userId: string;
}

const LiveContext = React.createContext<LiveContextValue | null>(null);

export function useLive() {
  const ctx = React.useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside <LiveProvider>");
  return ctx;
}

/**
 * One Realtime channel per signed-in session: keeps nav badges live and turns
 * new notifications (intros, messages, group invites, strong matches) into toasts.
 */
export function LiveProvider({
  userId,
  initialCounts,
  children,
}: {
  userId: string;
  initialCounts: BadgeCounts;
  children: React.ReactNode;
}) {
  const [counts, setCounts] = React.useState(initialCounts);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = React.useRef(pathname);
  pathRef.current = pathname;

  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const refresh = React.useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setCounts(await getBadgeCounts());
      } catch {
        // Offline or signed out — keep the last known counts.
      }
    }, 250);
  }, []);

  React.useEffect(() => setCounts(initialCounts), [initialCounts]);

  // Connect once the page is idle; supabase-js loads in its own chunk so it never delays first paint.
  React.useEffect(() => {
    let cancelled = false;
    let disconnect: (() => void) | undefined;
    const cancelIdle = whenIdle(() => {
      void import("@/lib/supabase/client").then(({ getSupabaseBrowser }) => {
        if (cancelled) return;
        const supabase = getSupabaseBrowser();
        const channel = supabase
      .channel(`live:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if ((payload.new as { sender_id?: string }).sender_id !== userId) refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          refresh();
          if (payload.eventType === "DELETE") return;
          const row = payload.new as {
            title: string;
            body: string;
            href: string | null;
            read_at: string | null;
            type: string;
          };
          if (row.read_at) return;
          // Don't toast about the conversation you're looking at.
          if (row.href && pathRef.current === row.href.split("?")[0]) return;
          toast(row.title, {
            description: row.body || undefined,
            action: row.href ? { label: "View", onClick: () => router.push(row.href!) } : undefined,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "intros", filter: `recipient_id=eq.${userId}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "group_requests" }, refresh)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
        refresh,
      )
      .subscribe();
        disconnect = () => void supabase.removeChannel(channel);
      });
    });

    return () => {
      cancelled = true;
      cancelIdle();
      disconnect?.();
    };
  }, [userId, refresh, router]);

  // Re-sync when the tab regains focus (realtime may have dropped while asleep).
  React.useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const value = React.useMemo(() => ({ counts, refresh, userId }), [counts, refresh, userId]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
