"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { setAiScreening } from "@/app/actions/safety";

/** Staff → Safety settings: the school's opt-in for AI message screening (Phase 0.5). */
export function AiScreeningSetting({
  schoolId,
  enabled,
  available,
  canEdit,
}: {
  schoolId: string;
  enabled: boolean;
  /** Switched on for this deployment (AI_MODERATION_ENABLED and a gateway key). */
  available: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = React.useState(enabled);
  const [pending, setPending] = React.useState(false);

  async function toggle(value: boolean) {
    setPending(true);
    setOn(value);
    const result = await setAiScreening(schoolId, value);
    setPending(false);
    if (!result.ok) {
      setOn(!value);
      return toast.error(result.error);
    }
    toast.success(value ? "AI screening on" : "AI screening off. Pattern checks continue.");
    router.refresh();
  }

  return (
    <section
      className="max-w-[760px] rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="ai-screening-title"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ai-screening-title" className="text-body font-semibold text-ink">
          AI message screening
        </h2>
        <Badge variant={on && available ? "success" : "neutral"}>
          {on && available ? "On" : on ? "On, waiting for Rumi" : "Off"}
        </Badge>
      </div>
      <p className="mt-1 text-body-sm text-ink-2">
        Rumi always checks messages and intros for payment asks, off-app contact, unknown links and
        slurs. With AI screening on, the text of each message and intro your students send is also
        read by an AI model (Anthropic&apos;s Claude, through Vercel&apos;s AI Gateway) to catch
        harassment, threats and scams the patterns miss. A confident result opens a report in Safety
        &amp; reports for your team to review. It never blocks, hides or suspends anyone. Both
        companies are listed on our{" "}
        <Link href="/security" className="text-accent-ink underline underline-offset-2">
          security page
        </Link>
        .
      </p>
      {!available ? (
        <p className="mt-2 text-caption text-ink-3">
          AI screening isn&apos;t switched on for this Rumi deployment yet. Your choice is saved and
          takes effect once it is.
        </p>
      ) : null}
      <label className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
        <span>
          Screen messages with AI
          <span className="block text-caption text-ink-3">
            {canEdit
              ? "Only housing admins can change this."
              : "Ask a housing admin to change this."}
          </span>
        </span>
        <Switch
          checked={on}
          disabled={!canEdit || pending}
          onCheckedChange={(v) => void toggle(v)}
          aria-label="Screen messages with AI"
        />
      </label>
    </section>
  );
}
