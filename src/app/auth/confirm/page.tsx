import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { ConfirmButton } from "@/components/auth/confirm-button";
import { confirmLink } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/**
 * One-tap link from the sign-in email (token_hash flow). Signing in waits for a button press:
 * school mail scanners open every link, and verifying on load would spend the code first.
 */
export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string; next?: string };
}) {
  if (!searchParams.token_hash) redirect("/login?error=link_expired");

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label="Rumi home">
        <Wordmark height={26} />
      </Link>
      <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
        <h1 className="font-display text-display-lg text-ink">One more tap.</h1>
        <p className="mt-3 text-body text-ink-2">Finish signing in to Rumi on this device.</p>
        <form action={confirmLink} className="mt-8">
          <input type="hidden" name="token_hash" value={searchParams.token_hash} />
          <input type="hidden" name="type" value={searchParams.type ?? "email"} />
          {searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
          <ConfirmButton />
        </form>
      </main>
    </div>
  );
}
