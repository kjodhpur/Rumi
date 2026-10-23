"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails; renders its own document. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-bg px-4 text-ink">
        <main className="max-w-[420px] text-center">
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight">Rumi hit a snag</h1>
          <p className="mt-3 text-body text-ink-2">Please reload the page. If it keeps happening, try again in a few minutes.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 h-12 rounded-md bg-ink px-5 text-body font-medium text-ink-inverse"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
