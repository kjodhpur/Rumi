"use client";

import * as React from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { linkSchoolEmail } from "@/app/actions/admissions";

/** Pre-arrival students move to their school email on the same account (3.1). */
export function LinkSchoolEmail({ domain }: { domain: string }) {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const r = await linkSchoolEmail(email);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setSentTo(r.data.email);
  }

  return (
    <section
      aria-labelledby="link-title"
      className="rounded-lg bg-accent-soft p-4 ring-1 ring-line sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-accent-ink">
          <GraduationCap className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="link-title" className="text-body-sm font-semibold text-ink">
            Got your school email?
          </h2>
          <p className="mt-0.5 text-body-sm text-ink-2">
            Add it here to move off the pre-arrival list. Your matches, chats and groups stay.
          </p>
          {sentTo ? (
            <p role="status" className="mt-3 text-body-sm text-ink">
              Check {sentTo} and tap the confirmation link. Until then you sign in with your
              personal email.
            </p>
          ) : (
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={(e) => (e.preventDefault(), void submit())}
            >
              <Field
                label="School email"
                error={error ?? undefined}
                className="min-w-[220px] flex-1"
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="email"
                    autoComplete="email"
                    placeholder={`you@${domain}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" loading={pending} disabled={!email.trim()}>
                Send confirmation
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
