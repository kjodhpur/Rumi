"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptInvite } from "@/app/actions/staff";
import { signOut } from "@/app/actions/auth";

type State = "ready" | "invalid" | "revoked" | "used" | "expired" | "wrong_email";

const MESSAGES: Record<Exclude<State, "ready" | "wrong_email">, { title: string; body: string }> = {
  invalid: { title: "This link doesn't work", body: "Check you opened the full link from the email, or ask your housing admin for a new invite." },
  revoked: { title: "This invite was withdrawn", body: "Ask your housing admin for a new one." },
  used: { title: "This invite was already used", body: "If that was you, go straight to your staff dashboard." },
  expired: { title: "This invite expired", body: "Invites work for 7 days. Ask your housing admin to resend it." },
};

export function InviteAccept(props: {
  token: string;
  state: State;
  signedInAs: string;
  invitedEmail: string | null;
  schoolName: string | null;
  roleLabel: string | null;
  roleDescription: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await acceptInvite({ token: props.token, firstName, lastName });
    if (!result.ok) {
      setPending(false);
      return setError(result.error);
    }
    setDone(true);
    router.replace(result.data.redirectTo);
  }

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-[440px]">
        <Wordmark height={26} className="mx-auto text-ink" />
        <div className="mt-10 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
          {props.state === "ready" ? (
            <>
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                <Building2 className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h1 className="mt-5 font-display text-display-sm text-ink">Join {props.schoolName} on Rumi</h1>
              <p className="mt-2 text-body-sm text-ink-2">
                You&apos;re invited as <span className="font-medium text-ink">{props.roleLabel}</span>. {props.roleDescription}
              </p>
              <p className="mt-4 text-caption text-ink-3">Signed in as {props.signedInAs}</p>
              <form onSubmit={accept} className="mt-6 flex flex-col gap-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    {({ id }) => (
                      <Input id={id} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
                    )}
                  </Field>
                  <Field label="Last name">
                    {({ id }) => (
                      <Input id={id} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                    )}
                  </Field>
                </div>
                <p className="text-caption text-ink-3">Your teammates see your name in the team list and audit log. Students never see it.</p>
                {error ? (
                  <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-body-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" block size="lg" loading={pending} success={done}>
                  Accept invite
                </Button>
              </form>
            </>
          ) : props.state === "wrong_email" ? (
            <>
              <h1 className="font-display text-display-sm text-ink">Wrong account</h1>
              <p className="mt-2 text-body-sm text-ink-2">
                This invite is for <span className="font-medium text-ink">{props.invitedEmail}</span>, but you&apos;re signed in as{" "}
                {props.signedInAs}.
              </p>
              <form action={signOut} className="mt-6">
                <Button type="submit" block size="lg">
                  Sign out and switch
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-display-sm text-ink">{MESSAGES[props.state].title}</h1>
              <p className="mt-2 text-body-sm text-ink-2">{MESSAGES[props.state].body}</p>
              {props.state === "used" ? (
                <Button asChild className="mt-6" block size="lg">
                  <Link href="/staff">Go to staff dashboard</Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
