"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, Phone } from "lucide-react";
import { reportMoveIn, requestRoomChange, submitCheckin, withdrawRoomChange } from "@/app/actions/checkins";
import { joinSwapPool, leaveSwapPool, respondToSwap } from "@/app/actions/room-swaps";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet } from "@/components/ui/sheet";
import { MultiChips } from "@/components/ui/choice";
import { GuidedMediation } from "@/components/retention/guided-mediation";
import { CHECKIN_TAGS, type CheckinTag, type RiskLevel } from "@/lib/retention/risk";
import type { CheckinHome } from "@/lib/checkins/load";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { cn } from "@/lib/utils";

const TAG_LABELS: Record<CheckinTag, string> = {
  noise: "Noise",
  guests: "Guests",
  cleanliness: "Cleanliness",
  schedule: "Schedule",
  communication: "Communication",
  other: "Other",
};

const RISK_COPY: Record<RiskLevel, { title: string; body: string }> = {
  low: { title: "Things look steady", body: "Nice. We'll check in again on the next date." },
  medium: { title: "Worth a conversation", body: "Something's shifted. A quick talk now usually keeps it small." },
  high: { title: "This needs attention", body: "It sounds like a hard stretch. Talking it through, or asking your RA, can help." },
};

const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function CheckInPanel({ home }: { home: CheckinHome }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [tags, setTags] = React.useState<CheckinTag[]>([]);
  const [note, setNote] = React.useState("");
  const [share, setShare] = React.useState(false);
  const [ask, setAsk] = React.useState(false);
  const [resources, setResources] = React.useState<{ crisis: boolean; threat: boolean } | null>(null);
  const [changeOpen, setChangeOpen] = React.useState(false);

  async function act<T>(key: string, fn: () => Promise<{ ok: true; data?: T } | { ok: false; error: string }>, success?: string) {
    setPending(key);
    const result = await fn();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    if (success) toast.success(success);
    router.refresh();
    return result;
  }

  async function moveIn(form: FormData) {
    await act("move", () => reportMoveIn({ building: String(form.get("building") ?? ""), room: String(form.get("room") ?? "") }), "Move-in saved. Your check-ins are scheduled.");
  }

  async function submit(e: React.FormEvent, askOverride = false) {
    e.preventDefault();
    if (score === null) return void toast.error("Pick a score from 1 to 5.");
    setPending("submit");
    const result = await submitCheckin({ score, tags, note, shareWithRa: share, askRa: ask || askOverride });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    setResources(result.data.crisis || result.data.threat ? { crisis: result.data.crisis, threat: result.data.threat } : null);
    toast.success(RISK_COPY[result.data.level].title, { description: result.data.raNotified ? "Your RA has been let know." : undefined });
    setScore(null);
    setTags([]);
    setNote("");
    setAsk(false);
    router.refresh();
  }

  async function askRaNow() {
    setPending("ask");
    const last = home.history.at(-1);
    const result = await submitCheckin({ score: last?.score ?? 3, tags: (home.latestTags.filter((t) => (CHECKIN_TAGS as readonly string[]).includes(t)) as CheckinTag[]).slice(0, 2), shareWithRa: true, askRa: true });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(result.data.raNotified ? "Your RA has been let know." : "Saved. Your housing office will follow up.");
    router.refresh();
  }

  if (!home.assignment) {
    return (
      <form action={moveIn} className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6">
        <div>
          <h2 className="text-body font-semibold text-ink">We moved in</h2>
          <p className="mt-1 text-body-sm text-ink-2">Your first check-in comes two weeks after today. You can send one early anytime.</p>
        </div>
        <Field label="Building">{({ id, describedBy }) => <Input id={id} name="building" required maxLength={80} placeholder="Tooker House" aria-describedby={describedBy} />}</Field>
        <Field label="Room" hint="Optional. Used only to compare with the people who name the same room.">
          {({ id, describedBy }) => <Input id={id} name="room" maxLength={40} placeholder="214" aria-describedby={describedBy} />}
        </Field>
        <Button type="submit" loading={pending === "move"}>
          Save move-in
        </Button>
      </form>
    );
  }

  const risk = home.risk;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-body-sm text-ink-2">
        {home.assignment.building}
        {home.assignment.room ? ` · Room ${home.assignment.room}` : ""} · moved in {date(home.assignment.movedInAt)}
      </p>

      {resources ? (
        <div className="flex flex-col gap-2 rounded-xl bg-danger-soft p-4 text-body-sm text-ink" role="alert">
          {resources.crisis ? (
            <p>
              If you might act on thoughts of suicide or self-harm, call or text <a href="tel:988" className="font-semibold underline underline-offset-4">988</a> now. You can also text HOME to 741741.
            </p>
          ) : null}
          {resources.threat ? (
            <p>
              If you&apos;re in danger, call <a href="tel:911" className="font-semibold underline underline-offset-4">911</a> or {LAUNCH_SCHOOL.police.name} at{" "}
              <a href={`tel:${LAUNCH_SCHOOL.police.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline underline-offset-4">{LAUNCH_SCHOOL.police.phone}</a>.
            </p>
          ) : null}
          <p className="text-caption text-ink-2">Your note stays private unless you chose to share it. Rumi doesn&apos;t replace these services.</p>
        </div>
      ) : null}

      {risk ? (
        <div className={cn("rounded-xl p-4 ring-1", risk.level === "high" ? "bg-warning-soft ring-warning/30" : "bg-surface ring-line")} aria-live="polite">
          <p className="flex items-center gap-2 text-body font-semibold text-ink">
            {risk.level !== "low" ? <AlertTriangle className="size-4 text-warning" aria-hidden /> : null}
            {RISK_COPY[risk.level].title}
          </p>
          <p className="mt-1 text-body-sm text-ink-2">{RISK_COPY[risk.level].body}</p>
          {risk.reasons.length ? (
            <ul className="mt-2 list-disc pl-5 text-caption text-ink-2">
              {risk.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {risk && risk.level !== "low" ? (
        <GuidedMediation
          tags={home.latestTags}
          sections={home.agreement?.sections ?? {}}
          groupId={home.agreement?.groupId ?? null}
          conversationId={home.conversationId}
          onAskRa={() => void askRaNow()}
          askingRa={pending === "ask"}
        />
      ) : null}

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6" noValidate>
        <div>
          <h2 className="text-body font-semibold text-ink">{home.next ? `Check-in due ${date(home.next.dueOn)}` : "Send a check-in"}</h2>
          <p className="mt-1 text-body-sm text-ink-2">Three taps. Your RA sees it only if you share it or ask for help.</p>
        </div>
        <fieldset>
          <legend className="text-body-sm font-medium text-ink">How is living together going?</legend>
          <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Score from 1 (rough) to 5 (great)">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n}${n === 1 ? ", rough" : n === 5 ? ", great" : ""}`}
                onClick={() => setScore(n)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-md text-body font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  score === n ? "bg-ink text-ink-inverse" : "bg-surface-sunken text-ink ring-1 ring-line hover:bg-surface-hover",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-caption text-ink-3">
            <span>Rough</span>
            <span>Great</span>
          </div>
        </fieldset>
        <Field label="Anything in particular?" hint="Up to two.">
          {({ id }) => <MultiChips aria-labelledby={id} value={tags} onValueChange={(v) => setTags(v.slice(-2))} options={CHECKIN_TAGS.map((t) => ({ value: t, label: TAG_LABELS[t] }))} />}
        </Field>
        <Field label="Private note" hint="Optional. Encrypted, and shared with your RA only if you turn that on.">
          {({ id, describedBy }) => <Textarea id={id} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={describedBy} />}
        </Field>
        <div className="flex flex-col divide-y divide-line rounded-md bg-surface-sunken">
          <label className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm text-ink">
            <span>
              Share this with my RA
              {!home.shareConsent ? (
                <span className="block text-caption text-ink-3">
                  Needs check-in sharing on in <Link href="/settings/privacy" className="underline underline-offset-4">Privacy</Link>.
                </span>
              ) : null}
            </span>
            <Switch checked={share} onCheckedChange={setShare} disabled={!home.shareConsent} aria-label="Share this check-in with my RA" />
          </label>
          <label className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm text-ink">
            <span>
              Ask my RA for help
              <span className="block text-caption text-ink-3">They&apos;ll see your first name, building and this check-in.</span>
            </span>
            <Switch checked={ask} onCheckedChange={setAsk} aria-label="Ask my RA for help" />
          </label>
        </div>
        <Button type="submit" loading={pending === "submit"} disabled={score === null}>
          Send check-in
        </Button>
      </form>

      <section className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6" aria-labelledby="room-change-title">
        <h2 id="room-change-title" className="flex items-center gap-2 text-body font-semibold text-ink">
          <ArrowLeftRight className="size-4 text-ink-3" aria-hidden /> Room change
        </h2>
        {home.swapOffer ? (
          <div className="mt-3 rounded-md bg-accent-soft p-4" aria-live="polite">
            <p className="text-body-sm font-medium text-ink">Housing suggested a room swap</p>
            <p className="mt-1 text-body-sm text-ink-2">
              Your match with your new roommate would be <span className="font-semibold text-ink tabular-nums">{home.swapOffer.newScore}</span> (now {home.swapOffer.currentScore}). Everyone in the swap gets a better match. Your housing office shares the room details if everyone says yes.
            </p>
            {home.swapOffer.answered ? (
              <p className="mt-3 text-caption text-ink-2">You said yes. Waiting on the others.</p>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" loading={pending === "swap-yes"} onClick={() => void act("swap-yes", () => respondToSwap(home.swapOffer!.id, true), "Thanks. We'll let you know when everyone answers.")}>
                  Yes, swap
                </Button>
                <Button size="sm" variant="secondary" loading={pending === "swap-no"} onClick={() => void act("swap-no", () => respondToSwap(home.swapOffer!.id, false), "No problem. The swap is off.")}>
                  No thanks
                </Button>
              </div>
            )}
          </div>
        ) : null}
        {home.roomChange ? (
          <>
            <p className="mt-1 text-body-sm text-ink-2">
              You asked for a room change ({home.roomChange.reasonKeys.map((k) => home.reasons.find((r) => r.key === k)?.label ?? k).join(", ")}). Housing staff decide on moves.
            </p>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
              <span>
                Look for a swap
                <span className="block text-caption text-ink-3">We&apos;ll suggest swaps where everyone&apos;s match gets better. Staff review them first.</span>
              </span>
              <Switch
                checked={home.roomChange.inSwapPool}
                disabled={pending === "swap"}
                onCheckedChange={(on) => void act("swap", () => (on ? joinSwapPool() : leaveSwapPool()), on ? "You're in the swap pool" : "You left the swap pool")}
                aria-label="Look for a swap"
              />
            </label>
            <Button variant="ghost" size="sm" className="mt-3" loading={pending === "withdraw"} onClick={() => void act("withdraw", withdrawRoomChange, "Request withdrawn")}>
              Withdraw request
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-ink-2">If talking it through hasn&apos;t worked, you can ask housing for a change.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setChangeOpen(true)}>
              Ask for a room change
            </Button>
          </>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-caption text-ink-3">
        <Phone className="size-3.5" aria-hidden /> Emergencies: 911 · {LAUNCH_SCHOOL.police.name} {LAUNCH_SCHOOL.police.phone} · 988 crisis line
      </p>

      <RoomChangeSheet open={changeOpen} onOpenChange={setChangeOpen} reasons={home.reasons} onDone={() => router.refresh()} />
    </div>
  );
}

function RoomChangeSheet({ open, onOpenChange, reasons, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; reasons: { key: string; label: string }[]; onDone: () => void }) {
  const [keys, setKeys] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await requestRoomChange({ reasonKeys: keys, note });
    setPending(false);
    if (!result.ok) return setError(result.error);
    onOpenChange(false);
    toast.success("Request sent to your housing office");
    onDone();
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Ask for a room change" description="Housing staff see your reasons. Your roommates aren't told." footer={<Button type="submit" form="room-change-form" block loading={pending}>Send request</Button>}>
      <form id="room-change-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="What's going on?" hint="Pick up to three." error={error}>
          {({ id }) => <MultiChips aria-labelledby={id} value={keys} onValueChange={(v) => setKeys(v.slice(-3))} options={reasons.map((r) => ({ value: r.key, label: r.label }))} />}
        </Field>
        <Field label="Anything else?" hint="Optional.">{({ id }) => <Textarea id={id} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </form>
    </Sheet>
  );
}
