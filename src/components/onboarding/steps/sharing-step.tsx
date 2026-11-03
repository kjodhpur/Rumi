"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setConsent } from "@/app/actions/consent";
import { CONSENT_COPY } from "@/lib/consent";

/** Optional final step: share Rumi results with the school's housing office. Off by default. */
export function SharingStep({ office, initialGranted }: { office: string; initialGranted: boolean }) {
  const [granted, setGranted] = React.useState(initialGranted);
  const [pending, setPending] = React.useState(false);
  const id = React.useId();

  async function toggle(value: boolean) {
    setGranted(value);
    setPending(true);
    const result = await setConsent("share_with_housing", value);
    setPending(false);
    if (!result.ok) {
      setGranted(!value);
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 rounded-xl bg-surface p-5 ring-1 ring-line">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
          <Building2 className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="text-body-sm font-semibold text-ink">
            Share my Rumi results with {office}
          </label>
          <p className="mt-1 text-body-sm text-ink-2">{CONSENT_COPY.share_with_housing.shares}</p>
        </div>
        <Switch
          id={id}
          checked={granted}
          disabled={pending}
          onCheckedChange={(v) => void toggle(v)}
          aria-describedby={`${id}-never`}
        />
      </div>

      <ul id={`${id}-never`} className="flex flex-col gap-2.5 px-1 text-body-sm text-ink-2">
        <li className="flex gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
          Staff see totals that include you either way. This only adds your own results.
        </li>
        <li className="flex gap-2.5">
          <X className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={2.25} aria-hidden />
          Never your messages, photos, email or exact answers.
        </li>
        <li className="flex gap-2.5">
          <X className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={2.25} aria-hidden />
          Turning it off removes your results from staff views right away.
        </li>
      </ul>
    </div>
  );
}
