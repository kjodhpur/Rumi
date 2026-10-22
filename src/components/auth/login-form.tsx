"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Mail } from "lucide-react";
import { requestCode, verifyCode } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { spring } from "@/lib/motion";

const RESEND_SECONDS = 30;

export function LoginForm({
  initialError,
  next,
  googleEnabled,
  showDevHint,
}: {
  initialError: string | null;
  next: string | null;
  googleEnabled: boolean;
  showDevHint: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(initialError);
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [googlePending, setGooglePending] = React.useState(false);

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
      setError("Google sign-in isn't available right now. Use your email instead.");
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
            <h1 className="font-display text-display-lg text-ink">Find your people.</h1>
            <p className="mt-3 text-body text-ink-2">
              Sign in or create an account with your {LAUNCH_SCHOOL.shortName} email. We&apos;ll
              send a 6-digit code — no passwords.
            </p>

            <form onSubmit={sendCode} className="mt-8 flex flex-col gap-4" noValidate>
              <Field label="School email" error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={`you@${LAUNCH_SCHOOL.domain}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leading={<Mail strokeWidth={1.75} />}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    required
                  />
                )}
              </Field>
              <Button type="submit" size="lg" block loading={pending}>
                Continue
              </Button>
            </form>

            {googleEnabled ? (
              <>
                <div className="my-6 flex items-center gap-4 text-caption text-ink-3">
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  block
                  onClick={signInWithGoogle}
                  loading={googlePending}
                >
                  <GoogleGlyph />
                  Continue with Google
                </Button>
                <p className="mt-2 text-center text-caption text-ink-3">
                  Use your {LAUNCH_SCHOOL.shortName} Google account
                </p>
              </>
            ) : null}

            <p className="mt-8 text-caption text-ink-3">
              By continuing you agree to our{" "}
              <Link href="/terms" className="text-ink-2 underline underline-offset-2 hover:text-ink">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-ink-2 underline underline-offset-2 hover:text-ink">
                Privacy Policy
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
              className="-ml-2 mb-6 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-body-sm font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
              Use a different email
            </button>
            <h1 className="font-display text-display-lg text-ink">Check your inbox.</h1>
            <p className="mt-3 text-body text-ink-2">
              Enter the code we sent to <span className="font-medium text-ink">{email}</span>.
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
                successLabel="Signed in"
                disabled={code.length !== 6}
              >
                Verify and continue
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-body-sm">
              <span className="text-ink-3">Didn&apos;t get it? Check spam.</span>
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={cooldown > 0 || pending}
                className="font-medium text-accent-ink underline-offset-4 hover:underline disabled:text-ink-3 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>

            {showDevHint ? (
              <p className="mt-8 rounded-md bg-surface-sunken px-3 py-2.5 text-caption text-ink-2">
                Local dev: read the code in Mailpit at{" "}
                <a className="font-medium underline" href="http://127.0.0.1:54324" target="_blank" rel="noreferrer">
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

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}
