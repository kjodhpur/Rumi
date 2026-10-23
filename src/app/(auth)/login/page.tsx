import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { publicEnv } from "@/lib/env";
import { LAUNCH_SCHOOL } from "@/lib/school";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Rumi with your school email.",
};

const ERRORS: Record<string, string> = {
  school_email: `That account isn't a school account. Sign in with your @${LAUNCH_SCHOOL.domain} email.`,
  oauth: "Google sign-in didn't finish. Try again, or use your email instead.",
  link_expired: "That sign-in link expired. Request a new code below.",
  suspended: `This account is suspended. Email ${publicEnv.supportEmail} if you think that's a mistake.`,
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; email?: string };
}) {
  const error = searchParams.error ? (ERRORS[searchParams.error] ?? ERRORS.oauth) : null;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-4 pt-6 pb-8 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label="Rumi home">
          <Wordmark height={26} />
        </Link>
        <main className="flex flex-1 items-center justify-center py-12">
          <LoginForm
            initialError={error}
            initialEmail={searchParams.email?.slice(0, 254)}
            next={searchParams.next ?? null}
            googleEnabled={publicEnv.googleAuthEnabled}
            showDevHint={process.env.NODE_ENV === "development"}
          />
        </main>
        <p className="text-center text-caption text-ink-3 lg:text-left">
          Free for students · Not affiliated with {LAUNCH_SCHOOL.name}
        </p>
      </div>
      <AuthShowcase />
    </div>
  );
}
