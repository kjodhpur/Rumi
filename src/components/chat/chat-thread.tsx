"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead, sendReply } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

export function ChatThread({
  conversationId,
  userId,
  initialMessages,
}: {
  conversationId: string;
  userId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null,
  );

  useEffect(() => {
    void markConversationRead(conversationId);
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}`, {
        config: { presence: { key: userId } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          void markConversationRead(conversationId);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === userId) return;
        setOtherTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 2000);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  function broadcastTyping() {
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-border bg-bg-elevated shadow-elevation1">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-accent text-accent-contrast" : "bg-bg-muted text-ink"
                  }`}
                >
                  {m.body}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {otherTyping ? (
          <p className="text-xs text-ink-muted" aria-live="polite">
            Typing…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (!text) return;
          startTransition(async () => {
            setError(null);
            const res = await sendReply({ conversationId, body: text });
            if (res.error) {
              setError(res.error);
              return;
            }
            setBody("");
          });
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            broadcastTyping();
          }}
          placeholder="Write a message"
          rows={2}
          className="min-h-[2.75rem] flex-1 resize-none"
        />
        <Button type="submit" disabled={pending || !body.trim()}>
          Send
        </Button>
      </form>
      {error ? (
        <p className="px-3 pb-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
