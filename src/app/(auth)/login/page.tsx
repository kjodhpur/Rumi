import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "@/components/auth/login-form";
import { ssoSchools } from "@/app/actions/auth";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { LocaleSwitch } from "@/components/auth/locale-switch";
import { WithI18n } from "@/components/providers/with-i18n";
import { publicEnv } from "@/lib/env";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("auth");
  return { title: t("title"), description: t("description") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; email?: string };
}) {
  const t = await getT("auth");
  const errors: Record<string, string> = {
    school_email: t("errors.schoolEmail", { domain: LAUNCH_SCHOOL.domain }),
    oauth: t("errors.oauth"),
    link_expired: t("errors.linkExpired"),
    suspended: t("errors.suspended", { email: publicEnv.supportEmail }),
  };
  const error = searchParams.error ? (errors[searchParams.error] ?? errors.oauth!) : null;
  const sso = await ssoSchools();
  return (
    <WithI18n>
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col px-4 pt-6 pb-8 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex w-fit rounded-sm text-ink" aria-label={t("home")}>
              <Wordmark height={26} />
            </Link>
            <LocaleSwitch />
          </div>
          <main className="flex flex-1 items-center justify-center py-12">
            <LoginForm
              initialError={error}
              initialEmail={searchParams.email?.slice(0, 254)}
              next={searchParams.next ?? null}
              googleEnabled={publicEnv.googleAuthEnabled}
              showDevHint={process.env.NODE_ENV === "development"}
              sso={sso}
            />
          </main>
          <p className="text-center text-caption text-ink-3 lg:text-left">
            {t("footer", { school: LAUNCH_SCHOOL.name })}
          </p>
        </div>
        <AuthShowcase />
      </div>
    </WithI18n>
  );
}
