"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";
import { RetryButton } from "@/components/marketing/retry-button";
import { usePageStrings } from "@/components/providers/cookie-locale";

/** The offline page is cached once by the service worker, so it picks its language in the browser. */
export function OfflineScreen() {
  const p = usePageStrings();
  React.useEffect(() => {
    document.title = `${p.offline.meta} · Rumi`;
  }, [p]);
  return (
    <>
      <span className="flex size-14 items-center justify-center rounded-lg bg-surface text-ink-2 shadow-sm ring-1 ring-line">
        <WifiOff className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-display-md text-ink">{p.offline.title}</h1>
      <p className="mt-2 text-body text-ink-2">{p.offline.body}</p>
      <RetryButton className="mt-8" label={p.tryAgain} />
    </>
  );
}
