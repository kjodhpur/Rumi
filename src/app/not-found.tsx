import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label="Rumi home">
        <Wordmark height={26} />
      </Link>
      <main id="main" className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center">
        <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">404</p>
        <h1 className="mt-3 font-display text-[44px] !leading-[1.05] text-ink sm:text-display-xl">This page moved out.</h1>
        <p className="mt-4 text-body text-ink-2">
          The link might be old, or the profile may no longer be available. Let&apos;s get you somewhere useful.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/matches">Go to your matches</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Rumi home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
