import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRoundX } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("pages");
  return { title: t("notStudent.title"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

/** Shown when a school sign-on says the account isn't a student's (Phase 3 affiliation mapping). */
export default async function NotAStudentPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const t = await getT("pages");
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 py-6 sm:px-8">
      <Link href="/" aria-label={t("home")} className="w-fit text-ink">
        <Wordmark height={26} />
      </Link>
      <main
        id="main"
        className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-start justify-center gap-4"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
          <UserRoundX className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-display-md text-ink">{t("notStudent.title")}</h1>
        <p className="text-body text-ink-2">{t("notStudent.body")}</p>
        <p className="text-body-sm text-ink-3">
          {t("notStudent.wrongLead")}{" "}
          <a
            className="font-medium text-accent-ink underline-offset-4 hover:underline"
            href={`mailto:${publicEnv.supportEmail}`}
          >
            {publicEnv.supportEmail}
          </a>
          .
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            {t("signOut")}
          </Button>
        </form>
      </main>
    </div>
  );
}
