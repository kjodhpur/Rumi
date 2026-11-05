import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/wordmark";
import { OfflineScreen } from "@/components/pages/offline-screen";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Served by the service worker when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Wordmark height={26} className="text-ink" />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[400px] flex-1 flex-col items-center justify-center text-center"
      >
        <OfflineScreen />
      </main>
    </div>
  );
}
