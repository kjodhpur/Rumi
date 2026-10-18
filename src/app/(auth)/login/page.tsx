"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { sendMagicLink, type AuthState } from "@/app/actions/auth";
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
    <div className="flex min-h-screen items-center justify-center bg-hero-mesh px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-asu-maroon" aria-label="Rumi home">
            <Wordmark size="lg" />
          </Link>
          <p className="mt-2 text-sm text-rumi-muted">
            Sign in with your ASU email. We&apos;ll send a magic link — no password.
          </p>
        </div>

        {searchParams.error === "suspended" ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            Your account has been suspended. Contact support if you believe this is a mistake.
          </p>
        ) : null}

        <form action={action} className="space-y-4 rounded-2xl border border-rumi-sand bg-white/80 p-6 shadow-sm">
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
            <p className="text-sm text-red-700" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-green-800" role="status">
              {state.success}
            </p>
          ) : null}
          <Submit />
        </form>

        <p className="text-center text-xs text-rumi-muted">
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
