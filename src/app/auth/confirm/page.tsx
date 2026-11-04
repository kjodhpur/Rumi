import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { ConfirmButton } from "@/components/auth/confirm-button";
import { confirmLink } from "@/app/actions/auth";
import { WithI18n } from "@/components/providers/with-i18n";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("auth"))("title"), robots: { index: false } };
}

/**
 * One-tap link from the sign-in email (token_hash flow). Signing in waits for a button press:
 * school mail scanners open every link, and verifying on load would spend the code first.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string; next?: string };
}) {
  if (!searchParams.token_hash) redirect("/login?error=link_expired");
  const t = await getT("auth");

  return (
    <WithI18n>
      <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
        <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label={t("home")}>
          <Wordmark height={26} />
        </Link>
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-display-lg text-ink">{t("confirmTitle")}</h1>
          <p className="mt-3 text-body text-ink-2">{t("confirmBody")}</p>
          <form action={confirmLink} className="mt-8">
            <input type="hidden" name="token_hash" value={searchParams.token_hash} />
            <input type="hidden" name="type" value={searchParams.type ?? "email"} />
            {searchParams.next ? (
              <input type="hidden" name="next" value={searchParams.next} />
            ) : null}
            <ConfirmButton />
          </form>
        </main>
      </div>
    </WithI18n>
  );
}
