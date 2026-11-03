"use client";

import * as React from "react";
import Link from "next/link";
import { Share2, Check, Copy, ShieldCheck, Sparkles, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import type { SafeMatchShareCard } from "@/lib/share/token";
import { createOrConsentMatchShare } from "@/app/actions/match-share";

interface MatchShareViewProps {
  card: SafeMatchShareCard;
  token: string;
  isConsentedByBoth: boolean;
  canConsent: boolean;
  partnerId?: string;
}

export function MatchShareView({
  card,
  token,
  isConsentedByBoth,
  canConsent,
  partnerId,
}: MatchShareViewProps) {
  const [copied, setCopied] = React.useState(false);
  const [isConsenting, setIsConsenting] = React.useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/m/${token}`
    : `/m/${token}`;

  async function handleShare() {
    const title = `${card.firstNames[0]} & ${card.firstNames[1]} on Rumi`;
    const text = `Check out our ${card.score}% roommate compatibility on Rumi!`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // User cancelled or unsupported
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied to clipboard", {
        description: "Anyone with this link can view this compatibility card.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Could not copy link", {
        description: "Please copy the URL from your browser address bar.",
      });
    }
  }

  async function handleConsent() {
    if (!partnerId) return;
    setIsConsenting(true);
    try {
      const res = await createOrConsentMatchShare(partnerId);
      if (res.ok) {
        toast("Consent granted!", {
          description: "This card is now public and ready to share.",
        });
        window.location.reload();
      } else {
        toast("Could not update consent", { description: res.error });
      }
    } finally {
      setIsConsenting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[var(--bg-canvas)] px-4 py-8 text-[var(--fg-canvas)]">
      {/* Brand Header */}
      <header className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] font-sans text-sm font-bold text-white">
            R
          </span>
          Rumi
        </Link>
        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--fg-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
          Verified Match
        </span>
      </header>

      {/* Card Content */}
      <main className="my-auto flex w-full max-w-md flex-col items-center">
        {!isConsentedByBoth && canConsent ? (
          <div className="mb-6 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-sm">
            <HeartHandshake className="mx-auto h-8 w-8 text-[var(--accent)]" />
            <h2 className="mt-3 font-display text-xl font-semibold">
              Share match with {card.firstNames[0]}?
            </h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {card.firstNames[0]} has agreed to share your compatibility card. If you consent, anyone with this link can view your first names, match score, and top 3 reasons (zero PII is shared).
            </p>
            <Button
              className="mt-5 w-full bg-[var(--accent)] text-white hover:opacity-90"
              onClick={handleConsent}
              disabled={isConsenting}
            >
              {isConsenting ? "Granting Consent..." : "Consent & Make Public"}
            </Button>
          </div>
        ) : null}

        <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl">
          {/* Top Pill */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Roommate Compatibility</span>
            </div>
            <span className="text-[11px] font-medium text-[var(--fg-muted)]">
              14-day share
            </span>
          </div>

          {/* Avatars & Names */}
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex items-center -space-x-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg-canvas)] text-xl font-bold text-[var(--fg-canvas)] shadow">
                {card.initials[0]}
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg-canvas)] text-xl font-bold text-[var(--fg-canvas)] shadow">
                {card.initials[1]}
              </div>
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
              {card.firstNames[0]} & {card.firstNames[1]}
            </h1>
            <p className="text-xs text-[var(--fg-muted)]">College Roommate Match</p>
          </div>

          {/* Score Ring Display */}
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-[var(--bg-canvas)]/60 p-4">
            <ScoreRing
              score={card.score}
              size={80}
              strokeWidth={6}
              variant="hero"
              animateOnMount
            />
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
              Compatibility Score
            </span>
          </div>

          {/* Top Reasons */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Why We&apos;re a Match
            </h3>
            <ul className="mt-2.5 space-y-2">
              {card.reasons.length > 0 ? (
                card.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-3 text-sm text-[var(--fg-canvas)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{reason}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-3 text-sm text-[var(--fg-muted)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>Complementary daily routines and aligned living preferences.</span>
                </li>
              )}
            </ul>
          </div>

          {/* Zero PII Assurance */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--fg-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Zero PII shared. Only first names and compatibility reasons.</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1 bg-[var(--accent)] text-white hover:opacity-90"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="mt-8 flex w-full max-w-md flex-col items-center text-center text-xs text-[var(--fg-muted)]">
        <p>Looking for your ideal college roommate?</p>
        <Link
          href="/"
          className="mt-1 font-semibold text-[var(--accent)] hover:underline"
        >
          Join Rumi for Free →
        </Link>
      </footer>
    </div>
  );
}
