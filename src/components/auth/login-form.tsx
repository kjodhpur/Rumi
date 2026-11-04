"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Mail } from "lucide-react";
import { requestCode, startSso, verifyCode } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { spring } from "@/lib/motion";
import { GoogleMark } from "@/components/brand/google-mark";
import { useT } from "@/components/providers/i18n";

const RESEND_SECONDS = 30;

export function LoginForm({
  initialError,
  initialEmail,
  next,
  googleEnabled,
  showDevHint,
  sso = [],
}: {
  initialError: string | null;
  /** Prefilled when the form was submitted natively before the page finished loading. */
  initialEmail?: string;
  next: string | null;
  googleEnabled: boolean;
  showDevHint: boolean;
  /** Schools with single sign-on (Phase 3); each gets a "Continue with" button. */
  sso?: { id: string; shortName: string }[];
}) {
  const router = useRouter();
  const tr = useT("auth");
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState(initialEmail ?? "");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(initialError);
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [googlePending, setGooglePending] = React.useState(false);
  const [ssoPending, setSsoPending] = React.useState<string | null>(null);

  async function signInWithSso(schoolId: string) {
    setSsoPending(schoolId);
    setError(null);
    const result = await startSso(schoolId, next);
    if (!result.ok) {
      setSsoPending(null);
      setError(result.error);
      return;
    }
    window.location.assign(result.data.url);
  }

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    const result = await requestCode(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmail(result.data.email);
    setCode("");
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function submitCode(value = code) {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await verifyCode({ email, token: value, next });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      setCode("");
      return;
    }
    setSuccess(true);
    router.replace(result.data.redirectTo);
    router.refresh();
  }

  async function signInWithGoogle() {
    setGooglePending(true);
    const { getSupabaseBrowser } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowser();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { hd: LAUNCH_SCHOOL.domain, prompt: "select_account" },
      },
    });
    if (oauthError) {
      setGooglePending(false);
      setError(tr("errors.google"));
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={spring}
          >
            <h1 className="font-display text-display-lg text-ink">{tr("heading")}</h1>
            <p className="mt-3 text-body text-ink-2">
              {tr("intro", { school: LAUNCH_SCHOOL.shortName })}
            </p>

            <form onSubmit={sendCode} className="mt-8 flex flex-col gap-4" noValidate>
              <Field label={tr("emailLabel")} error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={`you@${LAUNCH_SCHOOL.domain}`}
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leading={<Mail strokeWidth={1.75} />}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    required
                  />
                )}
              </Field>
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <Button type="submit" size="lg" block loading={pending}>
                {tr("continue")}
              </Button>
            </form>

            {sso.length ? (
              <div className="mt-6 flex flex-col gap-2">
                {sso.map((school) => (
                  <Button
                    key={school.id}
                    variant="secondary"
                    size="lg"
                    block
                    loading={ssoPending === school.id}
                    onClick={() => void signInWithSso(school.id)}
                  >
                    {tr("continueWithSso", { school: school.shortName })}
                  </Button>
                ))}
              </div>
            ) : null}

            {googleEnabled ? (
              <>
                <div className="my-6 flex items-center gap-4 text-caption text-ink-3">
                  <span className="h-px flex-1 bg-line" />
                  {tr("or")}
                  <span className="h-px flex-1 bg-line" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  block
                  onClick={signInWithGoogle}
                  loading={googlePending}
                >
                  <GoogleMark />
                  {tr("google")}
                </Button>
                <p className="mt-2 text-center text-caption text-ink-3">
                  {tr("googleHint", { school: LAUNCH_SCHOOL.shortName })}
                </p>
              </>
            ) : null}

            <p className="mt-8 text-caption text-ink-3">
              {tr("agreeStart")}{" "}
              <Link
                href="/terms"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                {tr("terms")}
              </Link>{" "}
              {tr("and")}{" "}
              <Link
                href="/privacy"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                {tr("privacy")}
              </Link>
              .
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={spring}
          >
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="mb-6 -ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
              {tr("differentEmail")}
            </button>
            <h1 className="font-display text-display-lg text-ink">{tr("checkInbox")}</h1>
            <p className="mt-3 text-body text-ink-2">
              {tr("enterCode")} <span className="font-medium text-ink">{email}</span>.
            </p>

            <form
              className="mt-8 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitCode();
              }}
            >
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError(null);
                }}
                onComplete={(v) => void submitCode(v)}
                disabled={pending || success}
                invalid={Boolean(error)}
                autoFocus
                aria-describedby={error ? "otp-error" : undefined}
              />
              <AnimatePresence initial={false}>
                {error ? (
                  <motion.p
                    id="otp-error"
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-body-sm text-danger"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <Button
                type="submit"
                size="lg"
                block
                loading={pending && !success}
                success={success}
                successLabel={tr("signedIn")}
                disabled={code.length !== 6}
              >
                {tr("verify")}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-body-sm">
              <span className="text-ink-3">{tr("spam")}</span>
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={cooldown > 0 || pending}
                className="font-medium text-accent-ink underline-offset-4 hover:underline disabled:text-ink-3 disabled:no-underline"
              >
                {cooldown > 0 ? tr("resendIn", { seconds: cooldown }) : tr("resend")}
              </button>
            </div>

            {showDevHint ? (
              <p className="mt-8 rounded-md bg-surface-sunken px-3 py-2.5 text-caption text-ink-2">
                {tr("devHint")}{" "}
                <a
                  className="font-medium underline"
                  href="http://127.0.0.1:54324"
                  target="_blank"
                  rel="noreferrer"
                >
                  127.0.0.1:54324
                </a>
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
