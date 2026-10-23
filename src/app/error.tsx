"use client";

import * as React from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label="Rumi home">
        <Wordmark height={26} />
      </Link>
      <main id="main" className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center">
        <h1 className="font-display text-[44px] !leading-[1.05] text-ink sm:text-display-xl">Something went wrong.</h1>
        <p className="mt-4 text-body text-ink-2">
          It&apos;s us, not you. Try again — and if it keeps happening, let us know.
          {error.digest ? <span className="mt-2 block text-caption text-ink-3">Reference: {error.digest}</span> : null}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Rumi home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
