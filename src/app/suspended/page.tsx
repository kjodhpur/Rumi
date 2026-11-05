import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { publicEnv } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("pages");
  return { title: t("suspended.meta"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const user = await getUser();
  const { data: profile } = user
    ? await createClient()
        .from("profiles")
        .select("banned_at, ban_reason")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  if (user && profile && !profile.banned_at) redirect("/matches");

  const support = publicEnv.supportEmail;
  const t = await getT("pages");
  const mailto = `mailto:${support}?subject=${encodeURIComponent(t("suspended.subject"))}`;
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label={t("home")}>
        <Wordmark height={26} />
      </Link>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
        <span className="mb-6 flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger">
          <ShieldAlert className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-display-md text-ink">{t("suspended.title")}</h1>
        <p className="mt-3 text-body text-ink-2">{t("suspended.body")}</p>
        {profile?.ban_reason ? (
          <div className="mt-6 rounded-lg bg-surface p-4 ring-1 ring-line">
            <p className="text-caption font-semibold tracking-wide text-ink-3 uppercase">
              {t("suspended.reason")}
            </p>
            <p className="mt-1 text-body-sm text-ink">{profile.ban_reason}</p>
          </div>
        ) : null}
        <p className="mt-6 text-body-sm text-ink-2">
          {t("suspended.mistakeLead")}{" "}
          <a href={mailto} className="font-medium text-ink underline underline-offset-4">
            {support}
          </a>{" "}
          {t("suspended.mistakeTail")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <a href={mailto}>{t("suspended.contact")}</a>
          </Button>
          {user ? (
            <>
              <Button asChild size="lg" variant="secondary">
                <a href="/api/account/export" download>
                  {t("suspended.download")}
                </a>
              </Button>
              <form action={signOut}>
                <Button type="submit" size="lg" variant="ghost" className="w-full">
                  {t("signOut")}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
