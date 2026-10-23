"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { dayLabel, formatTime, fullStamp, sameDay } from "@/lib/time";
import { useHydrated } from "@/hooks/use-hydrated";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp, ChevronLeft, Flag, MoreHorizontal, ShieldAlert, ShieldOff, UserRound, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportSheet } from "@/components/safety/report-sheet";
import { BlockSheet } from "@/components/safety/block-sheet";
import { SwipeBack } from "@/components/motion/swipe-back";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { loadOlderMessages, markRead, sendMessage } from "@/app/actions/messages";
import { leaveGroup } from "@/app/actions/groups";
import type { ChatMember, ChatMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { PAYMENT_SAFETY_TIP } from "@/lib/safety-copy";
import { springSnappy } from "@/lib/motion";
import { GroupAvatar } from "./inbox";

interface Thread {
  id: string;
  kind: "direct" | "group";
  groupId: string | null;
  title: string;
  members: ChatMember[];
  messages: ChatMessage[];
  hasMore: boolean;
  blocked: boolean;
}

const GROUP_GAP_MS = 5 * 60 * 1000;

export function ChatThread({ userId, thread }: { userId: string; thread: Thread }) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMessage[]>(thread.messages);
  const [members, setMembers] = React.useState<ChatMember[]>(thread.members);
  const [hasMore, setHasMore] = React.useState(thread.hasMore);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState<Record<string, number>>({});
  const [online, setOnline] = React.useState<Set<string>>(new Set());
  const [showJump, setShowJump] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [blocked, setBlocked] = React.useState(thread.blocked);

  const scroller = React.useRef<HTMLDivElement>(null);
  const topSentinel = React.useRef<HTMLDivElement>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastTypingSent = React.useRef(0);
  const readTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const others = members.filter((m) => m.id !== userId);
  const other = thread.kind === "direct" ? others[0] : undefined;
  const memberById = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // ── Scrolling ──────────────────────────────────────────────────────────────
  const nearBottom = () => {
    const el = scroller.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  React.useLayoutEffect(() => scrollToBottom("instant" as ScrollBehavior), []);

  // ── Read receipts ──────────────────────────────────────────────────────────
  const scheduleRead = React.useCallback(() => {
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible") void markRead(thread.id);
    }, 400);
  }, [thread.id]);

  React.useEffect(() => {
    scheduleRead();
    const onVisible = () => document.visibilityState === "visible" && scheduleRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [scheduleRead]);

  // ── Realtime: messages, read markers, typing, presence ────────────────────
  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`conversation:${thread.id}`, {
      config: { private: true, presence: { key: userId } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${thread.id}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string | null;
            kind: "text" | "system";
            body: string;
            created_at: string;
            client_id: string | null;
          };
          const incoming: ChatMessage = {
            id: row.id,
            senderId: row.sender_id,
            kind: row.kind,
            body: row.body,
            createdAt: row.created_at,
            clientId: row.client_id,
          };
          const stick = nearBottom() || row.sender_id === userId;
          setMessages((list) => upsertMessage(list, incoming));
          if (row.sender_id && row.sender_id !== userId) {
            setTyping((t) => {
              const next = { ...t };
              delete next[row.sender_id!];
              return next;
            });
            scheduleRead();
          }
          if (stick) requestAnimationFrame(() => scrollToBottom());
          else setShowJump(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${thread.id}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string };
          setMembers((list) => list.map((m) => (m.id === row.user_id ? { ...m, lastReadAt: row.last_read_at } : m)));
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const from = (payload as { userId?: string }).userId;
        if (!from || from === userId) return;
        setTyping((t) => ({ ...t, [from]: Date.now() }));
      })
      .on("broadcast", { event: "typing_stop" }, ({ payload }) => {
        const from = (payload as { userId?: string }).userId;
        if (!from) return;
        setTyping((t) => {
          const next = { ...t };
          delete next[from];
          return next;
        });
      })
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState()).filter((key) => key !== userId)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [thread.id, userId, scheduleRead]);

  // Expire stale typing indicators.
  React.useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([, at]) => now - at < 4000));
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [typing]);

  // ── Older messages ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    const el = topSentinel.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loadingOlder || messages.length === 0) return;
        setLoadingOlder(true);
        const box = scroller.current;
        const before = box?.scrollHeight ?? 0;
        const result = await loadOlderMessages(thread.id, messages[0].createdAt);
        setLoadingOlder(false);
        if (!result.ok) return;
        setHasMore(result.data.hasMore);
        setMessages((list) => [...result.data.messages.filter((m) => !list.some((x) => x.id === m.id)), ...list]);
        requestAnimationFrame(() => {
          if (box) box.scrollTop += box.scrollHeight - before;
        });
      },
      { root: scroller.current, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingOlder, messages, thread.id]);

  // ── Sending ────────────────────────────────────────────────────────────────
  function broadcastTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  }

  async function deliver(message: ChatMessage) {
    const result = await sendMessage({ conversationId: thread.id, body: message.body, clientId: message.clientId! });
    if (!result.ok) {
      setMessages((list) => list.map((m) => (m.clientId === message.clientId ? { ...m, status: "failed" } : m)));
      if (/can't reply/.test(result.error)) setBlocked(true);
      else toast.error(result.error);
      return;
    }
    setMessages((list) => upsertMessage(list, result.data));
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    const clientId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: `tmp-${clientId}`,
      senderId: userId,
      kind: "text",
      body,
      createdAt: new Date().toISOString(),
      clientId,
      status: "sending",
    };
    setDraft("");
    setMessages((list) => [...list, optimistic]);
    lastTypingSent.current = 0;
    void channelRef.current?.send({ type: "broadcast", event: "typing_stop", payload: { userId } });
    requestAnimationFrame(() => scrollToBottom());
    void deliver(optimistic);
  }

  function retry(message: ChatMessage) {
    setMessages((list) => list.map((m) => (m.clientId === message.clientId ? { ...m, status: "sending" } : m)));
    void deliver(message);
  }

  async function onLeaveGroup() {
    if (!thread.groupId) return;
    const result = await leaveGroup(thread.groupId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You left the group");
    router.replace("/groups");
  }

  // ── Derived UI ─────────────────────────────────────────────────────────────
  const lastText = [...messages].reverse().find((m) => m.kind === "text");
  // Receipts sit under your own latest message, and only while it's the newest one.
  const lastMine = lastText?.senderId === userId ? lastText : undefined;
  const seenBy = lastMine && !lastMine.status
    ? others.filter((m) => Date.parse(m.lastReadAt) >= Date.parse(lastMine.createdAt))
    : [];
  const typingNames = Object.keys(typing).map((id) => memberById.get(id)?.firstName).filter(Boolean) as string[];
  const subtitle =
    thread.kind === "group"
      ? `${members.length} members${online.size ? ` · ${online.size} online` : ""}`
      : other && online.has(other.id)
        ? "Active now"
        : "Verified student";

  return (
    <SwipeBack fallbackHref="/messages">
      <div className="flex h-dvh flex-col bg-bg">
        {/* Header */}
        <header className="glass pt-safe sticky top-0 z-20 border-b border-[var(--glass-border)]">
          <div className="mx-auto flex h-16 max-w-[820px] items-center gap-2 px-2 sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to messages"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/messages"))}
            >
              <ChevronLeft strokeWidth={1.75} />
            </Button>
            <Link
              href={thread.kind === "group" && thread.groupId ? `/groups/${thread.groupId}` : other ? `/profile/${other.id}` : "#"}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
            >
              {thread.kind === "group" ? (
                <GroupAvatar members={others} size={40} />
              ) : (
                <Avatar src={other?.avatarUrl} firstName={other?.firstName} lastInitial={other?.lastInitial} size={40} online={other ? online.has(other.id) : false} />
              )}
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold text-ink">{thread.title}</span>
                <span className="block truncate text-caption text-ink-3">{subtitle}</span>
              </span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Conversation options">
                  <MoreHorizontal strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {thread.kind === "group" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/groups/${thread.groupId}`}>
                        <Users /> View group
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => void onLeaveGroup()}>
                      <ShieldOff /> Leave group
                    </DropdownMenuItem>
                  </>
                ) : other ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${other.id}`}>
                        <UserRound /> View profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                      <Flag /> Report {other.firstName}
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setBlockOpen(true)}>
                      <ShieldOff /> Block {other.firstName}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages */}
        <div ref={scroller} className="relative flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite" aria-label={`Conversation with ${thread.title}`}>
          <div className="mx-auto flex max-w-[820px] flex-col px-3 pt-4 pb-6 sm:px-6">
            <div ref={topSentinel} aria-hidden className="h-px" />
            {loadingOlder ? (
              <div className="flex justify-center py-3 text-ink-3">
                <Spinner className="size-5" label="Loading earlier messages" />
              </div>
            ) : null}
            {!hasMore ? <ThreadStart thread={thread} others={others} /> : null}
            <MessageList
              messages={messages}
              userId={userId}
              kind={thread.kind}
              memberById={memberById}
              onRetry={retry}
            />
            <div className="flex min-h-6 justify-end px-1 pt-1">
              <AnimatePresence>
                {lastMine?.status === undefined && seenBy.length > 0 ? (
                  <motion.span
                    key="seen"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-caption text-ink-3"
                  >
                    {thread.kind === "direct" ? "Seen" : `Seen by ${seenBy.map((m) => m.firstName).join(", ")}`}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {typingNames.length > 0 ? <TypingBubble key="typing" names={typingNames} group={thread.kind === "group"} /> : null}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {showJump ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                onClick={() => {
                  setShowJump(false);
                  scrollToBottom();
                }}
                className="sticky bottom-4 left-1/2 mx-auto flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-body-sm font-medium text-ink-inverse shadow-lg"
              >
                <ArrowDown className="size-4" strokeWidth={2} aria-hidden /> New messages
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Composer */}
        <div className="glass pb-safe border-t border-[var(--glass-border)]">
          {blocked ? (
            <p className="mx-auto max-w-[820px] px-4 py-4 text-center text-body-sm text-ink-3">
              You can&apos;t send messages in this conversation.
            </p>
          ) : (
            <form
              className="mx-auto flex max-w-[820px] items-end gap-2 px-3 py-2.5 sm:px-6 sm:py-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Textarea
                aria-label={`Message ${thread.title}`}
                placeholder={thread.kind === "group" ? `Message ${thread.title}` : `Message ${other?.firstName ?? ""}`}
                rows={1}
                maxHeight={160}
                maxLength={2000}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (e.target.value) broadcastTyping();
                }}
                onKeyDown={(e) => {
                  const coarse = window.matchMedia("(pointer: coarse)").matches;
                  if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="min-h-11 flex-1 rounded-[22px] py-2.5"
              />
              <motion.button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim()}
                whileTap={{ scale: 0.9 }}
                transition={springSnappy}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-ink-inverse shadow-sm transition-opacity disabled:opacity-30"
              >
                <ArrowUp className="size-5" strokeWidth={2.25} />
              </motion.button>
            </form>
          )}
        </div>
      </div>

      {other ? (
        <>
          <ReportSheet open={reportOpen} onOpenChange={setReportOpen} reportedId={other.id} firstName={other.firstName} conversationId={thread.id} />
          <BlockSheet
            open={blockOpen}
            onOpenChange={setBlockOpen}
            userId={other.id}
            firstName={other.firstName}
            onBlocked={() => {
              setBlocked(true);
              router.refresh();
            }}
          />
        </>
      ) : null}
    </SwipeBack>
  );
}

function upsertMessage(list: ChatMessage[], message: ChatMessage) {
  const index = list.findIndex((m) => m.id === message.id || (message.clientId && m.clientId === message.clientId));
  if (index >= 0) {
    const next = [...list];
    next[index] = { ...message, status: undefined };
    return next;
  }
  return [...list, message].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function ThreadStart({ thread, others }: { thread: Thread; others: ChatMember[] }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-8 text-center">
      {thread.kind === "group" ? (
        <GroupAvatar members={others} size={64} />
      ) : (
        <Avatar src={others[0]?.avatarUrl} firstName={others[0]?.firstName} lastInitial={others[0]?.lastInitial} size={64} />
      )}
      <p className="font-display text-display-sm text-ink">{thread.title}</p>
      <p className="max-w-xs text-body-sm text-ink-3">
        {thread.kind === "group"
          ? "Plan your place together. Everyone here is a mutual match."
          : "You're connected. Talk budgets, neighborhoods and move-in dates — and tour places together before paying anything."}
      </p>
    </div>
  );
}

function MessageList({
  messages,
  userId,
  kind,
  memberById,
  onRetry,
}: {
  messages: ChatMessage[];
  userId: string;
  kind: "direct" | "group";
  memberById: Map<string, ChatMember>;
  onRetry: (m: ChatMessage) => void;
}) {
  const local = useHydrated();
  return (
    <AnimatePresence initial={false}>
      {messages.map((message, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const at = Date.parse(message.createdAt);
        const newDay = !prev || !sameDay(prev.createdAt, message.createdAt, local);
        const gap = prev ? at - Date.parse(prev.createdAt) > 60 * 60 * 1000 : false;
        const joinsPrev =
          prev && !newDay && prev.senderId === message.senderId && prev.kind === "text" && message.kind === "text" &&
          at - Date.parse(prev.createdAt) < GROUP_GAP_MS;
        const joinsNext =
          next && next.senderId === message.senderId && next.kind === "text" && message.kind === "text" &&
          sameDay(next.createdAt, message.createdAt, local) && Date.parse(next.createdAt) - at < GROUP_GAP_MS;
        const mine = message.senderId === userId;
        const sender = message.senderId ? memberById.get(message.senderId) : undefined;

        return (
          <React.Fragment key={message.clientId ?? message.id}>
            {newDay || gap ? (
              <p className="my-4 text-center text-caption font-medium text-ink-3" suppressHydrationWarning>
                {newDay ? `${dayLabel(message.createdAt, local)} · ${formatTime(message.createdAt, local)}` : formatTime(message.createdAt, local)}
              </p>
            ) : null}
            {message.kind === "system" && message.body === PAYMENT_SAFETY_TIP ? (
              <div role="note" className="mx-auto my-4 flex max-w-[440px] items-start gap-2.5 rounded-lg bg-warning-soft px-3.5 py-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} aria-hidden />
                <p className="text-body-sm text-ink">
                  <span className="font-semibold">Safety tip · </span>
                  {message.body.replace(/^Safety tip:\s*/, "").replace(/^./, (c) => c.toUpperCase())}
                </p>
              </div>
            ) : message.kind === "system" ? (
              <p className="my-3 text-center text-caption text-ink-3">{message.body}</p>
            ) : (
              <motion.div
                layout="position"
                initial={{ opacity: 0, y: 14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
                className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", joinsPrev ? "mt-0.5" : "mt-3")}
              >
                {!mine && kind === "group" ? (
                  <span className="w-7 shrink-0">
                    {!joinsNext ? <Avatar src={sender?.avatarUrl} firstName={sender?.firstName} lastInitial={sender?.lastInitial} size={28} /> : null}
                  </span>
                ) : null}
                <div className={cn("flex max-w-[78%] flex-col sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
                  {!mine && kind === "group" && !joinsPrev ? (
                    <span className="mb-1 px-3 text-caption text-ink-3">{sender?.firstName ?? "Former member"}</span>
                  ) : null}
                  <div
                    title={fullStamp(message.createdAt, local)}
                    className={cn(
                      "rounded-[20px] px-3.5 py-2 text-body break-words whitespace-pre-wrap",
                      mine ? "bg-ink text-ink-inverse" : "bg-surface text-ink ring-1 ring-line",
                      mine ? (joinsPrev ? "rounded-tr-md" : "") : joinsPrev ? "rounded-tl-md" : "",
                      mine ? (joinsNext ? "rounded-br-md" : "") : joinsNext ? "rounded-bl-md" : "",
                      message.status === "sending" && "opacity-60",
                      message.status === "failed" && "bg-danger-soft text-danger ring-1 ring-danger/30",
                    )}
                  >
                    <Linkified text={message.body} mine={mine && message.status !== "failed"} />
                  </div>
                  {message.status === "failed" ? (
                    <button type="button" onClick={() => onRetry(message)} className="mt-1 px-1 text-caption font-medium text-danger underline underline-offset-2">
                      Not sent · Tap to retry
                    </button>
                  ) : message.status === "sending" ? (
                    <span className="mt-1 px-1 text-caption text-ink-3">Sending…</span>
                  ) : null}
                </div>
              </motion.div>
            )}
          </React.Fragment>
        );
      })}
    </AnimatePresence>
  );
}

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;

/** Turns http(s) links into safe anchors; everything else stays plain text. */
function Linkified({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className={cn("underline underline-offset-2 break-all", mine ? "text-ink-inverse" : "text-accent-ink")}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function TypingBubble({ names, group }: { names: string[]; group: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      style={{ transformOrigin: "bottom left" }}
      className="mt-3 flex items-center gap-2"
      aria-live="polite"
    >
      <div className="flex h-9 items-center gap-1 rounded-[20px] bg-surface px-3.5 ring-1 ring-line" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-ink-3"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <span className="text-caption text-ink-3">
        {group ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing` : "typing"}
        <span className="sr-only">…</span>
      </span>
    </motion.div>
  );
}
