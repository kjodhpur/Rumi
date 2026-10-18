"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void markConversationRead(conversationId);
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
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
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
          void markConversationRead(conversationId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-rumi-sand bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-asu-maroon text-white" : "bg-rumi-sand text-rumi-ink"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-rumi-sand p-3">
        {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            className="min-h-[44px]"
            rows={2}
          />
          <Button
            type="button"
            disabled={pending || !body.trim()}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await sendReply({ conversationId, body });
                if (res.error) setError(res.error);
                else setBody("");
              })
            }
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
