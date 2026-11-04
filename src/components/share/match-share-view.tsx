"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, HeartHandshake, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { consentMatchShare } from "@/app/actions/match-share";
import type { SafeMatchShareCard } from "@/lib/share/token";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { useT } from "@/components/providers/i18n";

export function MatchCard({ card }: { card: SafeMatchShareCard }) {
  const t = useT("share");
  return (
    <article
      className="w-full rounded-2xl bg-surface p-6 shadow-md ring-1 ring-line sm:p-8"
      aria-label={t("cardLabel", { a: card.firstNames[0], b: card.firstNames[1] })}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex -space-x-3" aria-hidden>
          {card.initials.map((initial, i) => (
            <span
              key={i}
              className="flex size-14 items-center justify-center rounded-full bg-surface-sunken font-display text-display-sm text-ink ring-2 ring-surface"
            >
              {initial}
            </span>
          ))}
        </div>
        <ScoreRing score={card.score} size={72} variant="hero" />
      </div>
      <h1 className="mt-5 font-display text-display-md text-ink">
        {card.firstNames[0]} &amp; {card.firstNames[1]}
      </h1>
      <p className="mt-1 text-body-sm text-ink-2">{t("subtitle", { score: card.score })}</p>
      {card.reasons.length > 0 ? (
        <>
          <h2 className="mt-6 text-caption font-medium text-ink-3">{t("why")}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {card.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2.5 text-body-sm text-ink">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-accent-ink"
                  strokeWidth={2}
                  aria-hidden
                />
                {reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}

export function MatchShareView({
  card,
  path,
  mode,
  partnerId,
}: {
  card: SafeMatchShareCard;
  path: string;
  /** public: anyone with the link; consent: the participant who hasn't turned it on yet. */
  mode: "public" | "consent";
  partnerId?: string;
}) {
  const router = useRouter();
  const t = useT("share");
  const [copied, setCopied] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const url = () => `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      toast.success(t("linkCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareTitle", { a: card.firstNames[0], b: card.firstNames[1] }),
          url: url(),
        });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  async function consent() {
    if (!partnerId) return;
    setPending(true);
    const result = await consentMatchShare(partnerId);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(result.data.status.ready ? t("ready") : t("saved"));
    router.refresh();
  }

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center bg-bg px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-[440px] flex-1 flex-col">
        <Link href="/" className="mx-auto rounded-sm text-ink" aria-label={t("home")}>
          <Wordmark height={24} />
        </Link>

        {mode === "consent" ? (
          <section
            className="mt-10 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line"
            aria-labelledby="consent-title"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <HeartHandshake className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 id="consent-title" className="mt-4 font-display text-display-sm text-ink">
              {t("consentTitle")}
            </h2>
            <p className="mt-2 text-body-sm text-ink-2">{t("consentBody")}</p>
            <Button className="mt-5" block loading={pending} onClick={() => void consent()}>
              {t("turnOn")}
            </Button>
          </section>
        ) : null}

        <div className="mt-8">
          <MatchCard card={card} />
        </div>

        {mode === "public" ? (
          <div className="mt-4 flex gap-3">
            <Button className="flex-1" onClick={() => void share()}>
              <Share2 aria-hidden /> {t("share")}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => void copy()}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{" "}
              {copied ? t("copied") : t("copyLink")}
            </Button>
          </div>
        ) : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-caption text-ink-3">
          <ShieldCheck className="size-3.5" aria-hidden /> {t("privacyNote")}
        </p>

        <footer className="mt-auto pt-12 text-center text-caption text-ink-3">
          <Link href="/" className="font-medium text-accent-ink hover:underline">
            {t("find")}
          </Link>
          <span className="mt-1 block">{t("footer", { school: LAUNCH_SCHOOL.name })}</span>
        </footer>
      </div>
    </main>
  );
}
