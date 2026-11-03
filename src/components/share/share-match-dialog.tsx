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
    toast.success(result.data.status.ready ? "Your card is ready to share" : `We asked ${candidateFirstName} to turn it on too`);
  }

  async function revoke() {
    setPending(true);
    const result = await revokeMatchShare(candidateId);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(null);
    toast.success("Link turned off. It no longer opens for anyone.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${myFirstName} & ${candidateFirstName} on Rumi`, url: url() });
        return;
      } catch (shareError) {
        if ((shareError as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  const card = {
    firstNames: [myFirstName, candidateFirstName] as [string, string],
    initials: [myFirstName.charAt(0).toUpperCase(), candidateFirstName.charAt(0).toUpperCase()] as [string, string],
    score,
    reasons: reasons.slice(0, 3),
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Share2 aria-hidden /> Share
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Share your match card"
        description="First names, your score and up to three reasons. Never last names, photos, emails or where you live."
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
                  <span className="text-body-sm font-medium text-ink">Link</span>
                  {status.ready ? (
                    <Badge variant="success">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden /> Live
                    </Badge>
                  ) : (
                    <Badge variant="warning">Waiting for {candidateFirstName}</Badge>
                  )}
                </div>
                <p className="text-caption text-ink-2">
                  {status.ready
                    ? `Anyone with the link can see the card until ${new Date(status.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                    : `It opens for others once ${candidateFirstName} turns sharing on. We sent them a notification.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {status.ready ? (
                    <>
                      <Button size="sm" onClick={() => void share()}>
                        <Share2 aria-hidden /> Share
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void copy()}>
                        {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy link"}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={status.path} target="_blank" rel="noopener">
                          <ExternalLink aria-hidden /> Open
                        </a>
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="danger-ghost" loading={pending} onClick={() => void revoke()}>
                    <Link2Off aria-hidden /> Turn off
                  </Button>
                </div>
              </div>
            ) : (
              <Button block loading={pending} onClick={() => void turnOn()}>
                <Share2 aria-hidden /> Turn on sharing
              </Button>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
