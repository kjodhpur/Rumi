"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Copy, FileText, LifeBuoy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGuidedMediationTips } from "@/lib/retention/mediation";
import { useT } from "@/components/providers/i18n";

/**
 * Shown after a medium or high check-in read: what your agreement says about it, one tip,
 * and an opener you can edit and send to your roommates. Asking the RA is always one tap.
 */
export function GuidedMediation({
  tags,
  sections,
  groupId,
  conversationId,
  onAskRa,
  askingRa,
}: {
  tags: string[];
  sections: Record<string, string>;
  groupId: string | null;
  conversationId: string | null;
  onAskRa: () => void;
  askingRa: boolean;
}) {
  const t = useT("retention");
  const tc = useT("common");
  const [copied, setCopied] = React.useState<string | null>(null);
  const tips = getGuidedMediationTips(tags, sections, t);

  async function copy(tag: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(t("mediation.copyFailed"));
    }
  }

  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="mediation-title"
    >
      <h2 id="mediation-title" className="text-body font-semibold text-ink">
        {t("mediation.heading")}
      </h2>
      <p className="mt-1 text-body-sm text-ink-2">{t("mediation.intro")}</p>
      <ul className="mt-5 flex flex-col gap-5">
        {tips.map((tip) => (
          <li key={tip.tag} className="flex flex-col gap-3">
            <h3 className="text-body-sm font-medium text-ink">{tip.title}</h3>
            {tip.agreementText ? (
              <blockquote className="flex gap-2 rounded-md bg-surface-sunken p-3 text-caption text-ink-2">
                <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
                <span>
                  <span className="font-medium text-ink">{t("mediation.agreementSays")}</span>
                  {tip.agreementText}
                </span>
              </blockquote>
            ) : null}
            <p className="text-body-sm text-ink-2">{tip.advice}</p>
            <div className="rounded-md p-3 ring-1 ring-line">
              <p className="text-body-sm text-ink">&ldquo;{tip.suggestedMessage}&rdquo;</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {conversationId ? (
                  <Button size="sm" asChild>
                    <Link
                      href={`/messages/${conversationId}?draft=${encodeURIComponent(tip.suggestedMessage)}`}
                    >
                      <MessageCircle aria-hidden /> {t("mediation.editSend")}
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copy(tip.tag, tip.suggestedMessage)}
                >
                  {copied === tip.tag ? <Check aria-hidden /> : <Copy aria-hidden />}{" "}
                  {copied === tip.tag ? tc("copied") : tc("copy")}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        {groupId ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/groups/${groupId}/agreement`}>
              <FileText aria-hidden /> {t("mediation.openAgreement")}
            </Link>
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" loading={askingRa} onClick={onAskRa}>
          <LifeBuoy aria-hidden /> {t("mediation.askRa")}
        </Button>
      </div>
    </section>
  );
}
