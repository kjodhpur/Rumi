import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const user = await getUser();
  const { data: profile } = user
    ? await createClient().from("profiles").select("banned_at, ban_reason").eq("id", user.id).maybeSingle()
    : { data: null };
  if (user && profile && !profile.banned_at) redirect("/matches");

  const support = publicEnv.supportEmail;
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-8">
      <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label="Rumi home">
        <Wordmark height={26} />
      </Link>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
        <span className="mb-6 flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger">
          <ShieldAlert className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="font-display text-display-md text-ink">This account is suspended</h1>
        <p className="mt-3 text-body text-ink-2">
          After a review, our safety team suspended this account for breaking Rumi&apos;s community guidelines. Your
          profile is hidden from everyone and your chats are paused.
        </p>
        {profile?.ban_reason ? (
          <div className="mt-6 rounded-lg bg-surface p-4 ring-1 ring-line">
            <p className="text-caption font-semibold tracking-wide text-ink-3 uppercase">Reason</p>
            <p className="mt-1 text-body-sm text-ink">{profile.ban_reason}</p>
          </div>
        ) : null}
        <p className="mt-6 text-body-sm text-ink-2">
          If you think this is a mistake, email{" "}
          <a href={`mailto:${support}?subject=Account%20review`} className="font-medium text-ink underline underline-offset-4">
            {support}
          </a>{" "}
          from your school address and we&apos;ll take another look.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <a href={`mailto:${support}?subject=Account%20review`}>Contact support</a>
          </Button>
          {user ? (
            <>
              <Button asChild size="lg" variant="secondary">
                <a href="/api/account/export" download>
                  Download your data
                </a>
              </Button>
              <form action={signOut}>
                <Button type="submit" size="lg" variant="ghost" className="w-full">
                  Sign out
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
