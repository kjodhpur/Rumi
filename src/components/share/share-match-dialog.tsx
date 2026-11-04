"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Link2Off, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard } from "@/components/share/match-share-view";
import {
  consentMatchShare,
  getMatchShareStatus,
  revokeMatchShare,
  type MatchShareStatus,
} from "@/app/actions/match-share";
import { useIntlLocale, useT } from "@/components/providers/i18n";

/**
 * "Why we're a match" share card (Phase 7.7). Both students turn sharing on before the
 * link works for anyone else; either can revoke it, which 404s the link at once.
 */
export function ShareMatchDialog({
  candidateId,
  candidateFirstName,
  myFirstName,
  score,
  reasons,
}: {
  candidateId: string;
  candidateFirstName: string;
  myFirstName: string;
  score: number;
  reasons: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [status, setStatus] = React.useState<MatchShareStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const t = useT("share");
  const intl = useIntlLocale();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getMatchShareStatus(candidateId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setStatus(result.data.status);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, candidateId]);

  const url = () => (status ? `${window.location.origin}${status.path}` : "");

  async function turnOn() {
    setPending(true);
    const result = await consentMatchShare(candidateId);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(result.data.status);
    toast.success(
      result.data.status.ready ? t("yourCardReady") : t("asked", { name: candidateFirstName }),
    );
  }

  async function revoke() {
    setPending(true);
    const result = await revokeMatchShare(candidateId);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(null);
    toast.success(t("turnedOff"));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${myFirstName} & ${candidateFirstName} on Rumi`,
          url: url(),
        });
        return;
      } catch (shareError) {
        if ((shareError as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  const card = {
    firstNames: [myFirstName, candidateFirstName] as [string, string],
    initials: [myFirstName.charAt(0).toUpperCase(), candidateFirstName.charAt(0).toUpperCase()] as [
      string,
      string,
    ],
    score,
    reasons: reasons.slice(0, 3),
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Share2 aria-hidden /> {t("share")}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t("dialogTitle")}
        description={t("dialogBody")}
        size="md"
      >
        <div className="flex flex-col gap-5">
          <MatchCard card={card} />
          <div aria-live="polite">
            {loading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : error ? (
              <p className="text-body-sm text-danger">{error}</p>
            ) : status ? (
              <div className="flex flex-col gap-3 rounded-xl bg-surface-sunken p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body-sm font-medium text-ink">{t("link")}</span>
                  {status.ready ? (
                    <Badge variant="success">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden /> {t("live")}
                    </Badge>
                  ) : (
                    <Badge variant="warning">{t("waitingFor", { name: candidateFirstName })}</Badge>
                  )}
                </div>
                <p className="text-caption text-ink-2">
                  {status.ready
                    ? t("until", {
                        date: new Date(status.expiresAt).toLocaleDateString(intl, {
                          month: "short",
                          day: "numeric",
                        }),
                      })
                    : t("opensOnce", { name: candidateFirstName })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {status.ready ? (
                    <>
                      <Button size="sm" onClick={() => void share()}>
                        <Share2 aria-hidden /> {t("share")}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void copy()}>
                        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{" "}
                        {copied ? t("copied") : t("copyLink")}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={status.path} target="_blank" rel="noopener">
                          <ExternalLink aria-hidden /> {t("open")}
                        </a>
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    loading={pending}
                    onClick={() => void revoke()}
                  >
                    <Link2Off aria-hidden /> {t("turnOff")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button block loading={pending} onClick={() => void turnOn()}>
                <Share2 aria-hidden /> {t("turnOn")}
              </Button>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
