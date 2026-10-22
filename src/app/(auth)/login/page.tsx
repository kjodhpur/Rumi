"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { sendMagicLink, signInWithGoogle, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand/wordmark";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Email me a magic link"}
    </Button>
  );
}

const initial: AuthState = {};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [state, action] = useFormState(sendMagicLink, initial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-atmosphere px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-accent" aria-label="Rumi home">
            <Wordmark size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in with your ASU email. Magic link or Google — school domain required.
          </p>
        </div>

        {searchParams.error === "suspended" ? (
          <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            Your account has been suspended. Contact support if you believe this is a mistake.
          </p>
        ) : null}
        {searchParams.error === "config" ? (
          <p className="rounded-md bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
            Auth isn’t configured in this environment yet.
          </p>
        ) : null}

        <form
          action={action}
          className="space-y-4 rounded-lg border border-border bg-bg-elevated/90 p-6 shadow-elevation2"
        >
          <div className="space-y-2">
            <Label htmlFor="email">ASU email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@asu.edu"
              autoComplete="email"
            />
          </div>
          {state.error ? (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-success" role="status">
              {state.success}
            </p>
          ) : null}
          <Submit />
        </form>

        <form action={signInWithGoogle}>
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>

        <p className="text-center text-xs text-ink-muted">
          Only @asu.edu addresses are accepted. By continuing you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
