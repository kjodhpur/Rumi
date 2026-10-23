import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { RetryButton } from "@/components/marketing/retry-button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Served by the service worker when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Wordmark height={26} className="text-ink" />
      <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-14 items-center justify-center rounded-lg bg-surface text-ink-2 shadow-sm ring-1 ring-line">
          <WifiOff className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-display-md text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-body text-ink-2">
          Rumi needs a connection to load matches and messages. We&apos;ll pick up where you left off as soon as
          you&apos;re back.
        </p>
        <RetryButton className="mt-8" />
      </main>
    </div>
  );
}
