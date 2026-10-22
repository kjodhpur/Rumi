"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendIntro } from "@/app/actions/social";

export function IntroSheet({
  open,
  onOpenChange,
  recipientId,
  firstName,
  topReason,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  firstName: string;
  topReason?: string;
  onSent: () => void;
}) {
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  const starters = [
    topReason
      ? `Hi ${firstName}! Rumi says we'd get along — ${lowerFirst(topReason)}. Want to chat about finding a place?`
      : `Hi ${firstName}! Rumi says we'd get along. Want to chat about finding a place?`,
    `Hey ${firstName} — still looking for a roommate? I think we'd be a good fit.`,
    "Hi! What's your ideal setup — somewhere near campus or a bit quieter?",
  ];

  async function submit() {
    setPending(true);
    setError(null);
    const result = await sendIntro({ recipientId, message });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onOpenChange(false);
      onSent();
      setMessage("");
      toast.success(`Intro sent to ${firstName}`, { description: "You'll be notified if they accept." });
    }, 700);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Say hi to ${firstName}`}
      description="Your intro arrives as a request. If they accept, your chat opens."
      footer={
        <Button
          size="lg"
          block
          onClick={() => void submit()}
          loading={pending}
          success={success}
          successLabel="Sent"
          disabled={message.trim().length < 10}
        >
          Send intro
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Textarea
          aria-label={`Intro message to ${firstName}`}
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Say why you think you'd get along…`}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
        <div className="flex items-center justify-between text-caption text-ink-3">
          <span>{error ? <span role="alert" className="text-danger">{error}</span> : "Be specific — mention what you have in common."}</span>
          <span className="tabular">{message.length}/500</span>
        </div>
        <div className="flex flex-col gap-2">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => setMessage(starter)}
              className="rounded-md bg-surface-sunken px-3.5 py-2.5 text-left text-body-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink active:scale-[0.99]"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
