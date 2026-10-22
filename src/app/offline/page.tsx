import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <Wordmark size="lg" className="text-accent" />
      <h1 className="font-ui mt-6 text-2xl font-semibold text-ink">You’re offline</h1>
      <p className="mt-2 max-w-sm text-ink-muted">
        Rumi needs a connection to load matches. Check your network and try again.
      </p>
      <Link
        href="/matches"
        className="font-ui mt-6 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast"
      >
        Retry
      </Link>
    </div>
  );
}
