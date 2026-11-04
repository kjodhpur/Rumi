"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendIntro } from "@/app/actions/social";
import { offerPush } from "@/lib/push/client";
import { useT } from "@/components/providers/i18n";

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
  const t = useT("profile");
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
      ? t("intro.starterReason", { name: firstName, reason: lowerFirst(topReason) })
      : t("intro.starter", { name: firstName }),
    t("intro.starter2", { name: firstName }),
    t("intro.starter3"),
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
      toast.success(t("intro.sentToast", { name: firstName }), {
        description: t("intro.sentHint"),
      });
      window.setTimeout(() => offerPush(t("intro.push", { name: firstName })), 2500);
    }, 700);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("intro.title", { name: firstName })}
      description={t("intro.description")}
      footer={
        <Button
          size="lg"
          block
          onClick={() => void submit()}
          loading={pending}
          success={success}
          successLabel={t("intro.sent")}
          disabled={message.trim().length < 10}
        >
          {t("intro.send")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Textarea
          aria-label={t("intro.label", { name: firstName })}
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("intro.placeholder")}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
        <div className="flex items-center justify-between text-caption text-ink-3">
          <span>
            {error ? (
              <span role="alert" className="text-danger">
                {error}
              </span>
            ) : (
              t("intro.hint")
            )}
          </span>
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
