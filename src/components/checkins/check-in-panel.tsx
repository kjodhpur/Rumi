"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reportMoveIn, submitCheckin } from "@/app/actions/checkins";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHECKIN_TAGS, type CheckinTag, type RiskLevel } from "@/lib/retention/risk";
import type { CheckinHome } from "@/lib/checkins/load";
import { cn } from "@/lib/utils";

const TAG_LABELS: Record<CheckinTag, string> = {
  noise: "Noise",
  guests: "Guests",
  cleanliness: "Cleanliness",
  schedule: "Schedule",
  communication: "Communication",
  other: "Other",
};

const RISK_COPY: Record<RiskLevel, string> = {
  low: "Things look steady.",
  medium: "Worth a conversation.",
  high: "This needs attention.",
};

export function CheckInPanel({ home }: { home: CheckinHome }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [crisis, setCrisis] = React.useState(false);

  async function moveIn(form: FormData) {
    setPending("move");
    const result = await reportMoveIn({ building: String(form.get("building") ?? ""), room: String(form.get("room") ?? "") });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Move-in saved. Check-ins are scheduled.");
    router.refresh();
  }

  async function submit(form: FormData) {
    const score = Number(form.get("score"));
    const tags = form.getAll("tags").map(String).filter((tag): tag is CheckinTag => (CHECKIN_TAGS as readonly string[]).includes(tag));
    setPending("submit");
    const result = await submitCheckin({
      score,
      tags: tags.slice(0, 2),
      note: String(form.get("note") ?? ""),
      shareWithRa: form.get("share") === "on",
      askRa: form.get("ask") === "on",
    });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCrisis(result.data.crisis);
    toast.success(RISK_COPY[result.data.level]);
    router.refresh();
  }

  if (!home.assignment) {
    return (
      <form action={moveIn} className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6">
        <div>
          <h2 className="text-body font-semibold text-ink">We moved in</h2>
          <p className="mt-1 text-body-sm text-ink-2">Check-ins start two weeks after this date. You can send one early.</p>
        </div>
        <Field label="Building">
          {({ id, describedBy }) => <Input id={id} name="building" required maxLength={80} placeholder="Tooker House" aria-describedby={describedBy} />}
        </Field>
        <Field label="Room" hint="Optional. Used only to compare with the people who name the same room.">
          {({ id, describedBy }) => <Input id={id} name="room" maxLength={40} placeholder="214" aria-describedby={describedBy} />}
        </Field>
        <Button type="submit" loading={pending === "move"}>
          Save move-in
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-2">
        {home.assignment.building}
        {home.assignment.room ? ` · ${home.assignment.room}` : ""} · moved in {home.assignment.movedInAt}
      </p>
      {crisis ? (
        <div className="rounded-xl bg-danger-soft p-4 text-body-sm text-ink" role="status">
          If you might act on thoughts of suicide or self-harm, call or text <strong>988</strong> now. This note stays private unless you chose to share it.
        </div>
      ) : null}
      {home.risk ? (
        <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
          <p className="text-caption font-medium text-ink-3 uppercase">Latest read</p>
          <p className="mt-1 text-body font-semibold text-ink">{RISK_COPY[home.risk.level]}</p>
          {home.risk.reasons.length ? <ul className="mt-2 list-disc pl-5 text-body-sm text-ink-2">{home.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
        </div>
      ) : null}
      <form action={submit} className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6">
        <div>
          <h2 className="text-body font-semibold text-ink">{home.next ? `Check-in due ${home.next.dueOn}` : "Another check-in"}</h2>
          <p className="mt-1 text-body-sm text-ink-2">Three taps. Your RA sees this only if you share it or ask them for help.</p>
        </div>
        <fieldset>
          <legend className="text-body-sm font-medium text-ink">How is it going, 1 to 5?</legend>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <label key={score} className="flex-1">
                <input className="peer sr-only" type="radio" name="score" value={score} required defaultChecked={score === 4} />
                <span className="flex h-11 items-center justify-center rounded-lg bg-surface-sunken text-body font-semibold text-ink ring-1 ring-line peer-checked:bg-ink peer-checked:text-ink-inverse peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
                  {score}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-body-sm font-medium text-ink">Anything in particular? Up to two.</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHECKIN_TAGS.map((tag) => (
              <label key={tag}>
                <input className="peer sr-only" type="checkbox" name="tags" value={tag} />
                <span className={cn("inline-flex h-9 items-center rounded-full bg-surface-sunken px-3 text-body-sm text-ink ring-1 ring-line peer-checked:bg-ink peer-checked:text-ink-inverse peer-focus-visible:ring-2 peer-focus-visible:ring-focus")}>
                  {TAG_LABELS[tag]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Private note" hint="Optional. Shared with your RA only if you turn that on below.">
          {({ id, describedBy }) => <Textarea id={id} name="note" rows={3} maxLength={1000} aria-describedby={describedBy} />}
        </Field>
        <label className="flex items-start gap-3 text-body-sm text-ink">
          <input type="checkbox" name="share" className="mt-1" />
          Share this check-in, including the note, with my RA
        </label>
        <label className="flex items-start gap-3 text-body-sm text-ink">
          <input type="checkbox" name="ask" className="mt-1" />
          Ask my RA for help
        </label>
        <Button type="submit" loading={pending === "submit"}>
          Send check-in
        </Button>
      </form>
    </div>
  );
}
