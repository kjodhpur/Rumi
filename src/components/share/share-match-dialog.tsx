"use client";

import * as React from "react";
import { Share2, Check, Copy, Shield, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  createOrConsentMatchShare,
  getMatchShareStatus,
  revokeMatchShare,
  type MatchShareStatus,
} from "@/app/actions/match-share";

interface ShareMatchDialogProps {
  candidateId: string;
  candidateFirstName: string;
  score: number;
  reasons: string[];
}

export function ShareMatchDialog({
  candidateId,
  candidateFirstName,
  score,
  reasons,
}: ShareMatchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<MatchShareStatus | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Load status when dialog opens
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await getMatchShareStatus(candidateId);
        if (!cancelled && res.ok) {
          setStatus(res.data.status);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, candidateId]);

  const shareUrl = status?.token
    ? typeof window !== "undefined"
      ? `${window.location.origin}/m/${status.token}`
      : `/m/${status.token}`
    : "";

  async function handleCreateOrConsent() {
    setLoading(true);
    try {
      const res = await createOrConsentMatchShare(candidateId);
      if (res.ok) {
        toast(res.data.isReady ? "Match card ready to share!" : "Consent recorded", {
          description: res.data.isReady
            ? "Both of you have consented. The public link is now active."
            : `We'll make the link public once ${candidateFirstName} also consents.`,
        });
        // Reload status
        const refresh = await getMatchShareStatus(candidateId);
        if (refresh.ok) setStatus(refresh.data.status);
      } else {
        toast("Could not create share card", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      const res = await revokeMatchShare(candidateId);
      if (res.ok) {
        toast("Share link revoked", {
          description: "The link now immediately 404s for anyone who visits.",
        });
        setStatus(null);
      } else {
        toast("Could not revoke share card", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Could not copy link");
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Match with ${candidateFirstName} on Rumi`,
          text: `Check out our ${Math.round(score)}% roommate compatibility on Rumi!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  }

  const topReasons = reasons.slice(0, 3);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5"
      >
        <Share2 className="size-3.5 text-accent" />
        <span>Share match card</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Why we're a match"
        description="Share a private, expiring compatibility card with friends or family."
        size="md"
      >
        <div className="space-y-5 py-2">
          {/* Card Preview */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-xs font-semibold uppercase tracking-wider text-accent">
                  Roommate Compatibility
                </p>
                <h4 className="mt-1 font-display text-lg font-bold text-ink">
                  You & {candidateFirstName}
                </h4>
              </div>
              <ScoreRing score={score} size={54} variant="hero" />
            </div>

            {topReasons.length > 0 ? (
              <div className="mt-4 space-y-1.5 border-t border-line pt-3">
                {topReasons.map((r, i) => (
                  <p key={i} className="flex items-start gap-2 text-caption text-ink-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-1.5 text-caption-xs text-ink-3">
              <Shield className="size-3.5 text-accent" />
              <span>Zero PII: no last names, email addresses, or dorm buildings are shared.</span>
            </div>
          </div>

          {/* Mutual Consent Status */}
          {status ? (
            <div className="rounded-xl border border-line bg-surface-sunken p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-ink">Sharing status</span>
                {status.isReady ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-caption font-semibold text-emerald-600">
                    <Check className="size-3" strokeWidth={3} /> Active & Public
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-caption font-semibold text-amber-600">
                    Awaiting {candidateFirstName}&apos;s consent
                  </span>
                )}
              </div>

              {!status.isReady ? (
                <p className="text-caption text-ink-2">
                  You have consented to share this card. For safety and privacy, the public link will only activate once {candidateFirstName} visits and also consents.
                </p>
              ) : (
                <p className="text-caption text-ink-2">
                  Both students have agreed to share this card. This link expires in 14 days or immediately upon revocation.
                </p>
              )}

              {/* Actions when token exists */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-accent text-white hover:opacity-90"
                  onClick={handleNativeShare}
                  disabled={loading}
                >
                  <Share2 className="mr-1.5 size-3.5" />
                  Share card
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  disabled={loading}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" /> Copy link
                    </>
                  )}
                </Button>
                <a
                  href={`/m/${status.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink hover:bg-surface-sunken"
                >
                  <ExternalLink className="size-3.5" /> View card
                </a>
              </div>

              <div className="border-t border-line pt-2 text-right">
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-caption-xs font-medium text-rose-600 hover:underline"
                >
                  <Trash2 className="size-3" /> Revoke link immediately
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-body-sm text-ink-2">
                Create a shareable link to show friends, roommates, or family why you and {candidateFirstName} make great roommates.
              </p>
              <Button
                className="w-full bg-accent text-white hover:opacity-90"
                onClick={handleCreateOrConsent}
                disabled={loading}
              >
                <Share2 className="mr-2 size-4" />
                {loading ? "Generating..." : "Create share card & consent"}
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
