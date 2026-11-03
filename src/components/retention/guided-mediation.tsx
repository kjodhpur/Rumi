"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Check, MessageSquare, ShieldAlert, FileText, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CheckinTag } from "@/lib/retention/risk";
import { getGuidedMediationTips } from "@/lib/retention/mediation";

interface GuidedMediationProps {
  tags: CheckinTag[];
  groupId?: string | null;
  onAskRa?: () => void;
}

export function GuidedMediation({ tags, groupId, onAskRa }: GuidedMediationProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const tips = getGuidedMediationTips(tags);

  function copyMessage(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Opener copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2 text-body-xs font-semibold uppercase tracking-wider text-accent">
        <MessageSquare className="size-4" />
        <span>Guided Self-Mediation</span>
      </div>
      <h3 className="mt-1 text-body-lg font-semibold text-ink">
        Small friction catches early
      </h3>
      <p className="mt-1 text-body-sm text-ink-3">
        Most roommate friction resolves quickly with a relaxed, low-pressure conversation based on your shared agreement.
      </p>

      <div className="mt-4 space-y-4">
        {tips.map((tip, idx) => (
          <div
            key={tip.tag}
            className="rounded-xl border border-line bg-surface-sunken p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm font-semibold text-ink">{tip.title}</span>
              <span className="text-caption-xs font-medium text-ink-3">
                {tip.agreementSection}
              </span>
            </div>
            <p className="mt-1.5 text-body-xs text-ink-2">{tip.advice}</p>

            <div className="mt-3 rounded-lg border border-line bg-surface p-3">
              <p className="text-caption-xs font-semibold uppercase tracking-wider text-ink-3">
                Suggested message to send
              </p>
              <p className="mt-1 text-body-sm text-ink italic">&ldquo;{tip.suggestedMessage}&rdquo;</p>
              <div className="mt-2.5 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyMessage(tip.suggestedMessage, idx)}
                  className="inline-flex items-center gap-1.5"
                >
                  {copiedIndex === idx ? (
                    <Check className="size-3.5 text-accent" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>{copiedIndex === idx ? "Copied" : "Copy opener"}</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {groupId ? (
          <Link
            href={`/groups/${groupId}/agreement`}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-ink underline underline-offset-4 hover:text-accent"
          >
            <FileText className="size-4" />
            <span>Open Roommate Agreement</span>
          </Link>
        ) : <div />}

        {onAskRa ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAskRa}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700"
          >
            <UserPlus className="size-3.5" />
            <span>Ask RA to assist mediation</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
