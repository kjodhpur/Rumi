"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  confirmPhoneVerification,
  removePhone,
  saveNotificationPreference,
  startPhoneVerification,
} from "@/app/actions/notification-channels";
import {
  CHANNEL_LABEL,
  CHANNELS,
  KIND_DESCRIPTION,
  KIND_LABEL,
  NOTIFICATION_KINDS,
  type Channel,
  type Matrix,
  type NotificationKind,
} from "@/lib/notifications/channels";
import {
  currentPushSubscription,
  pushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/push/client";
import { SettingsBack, SettingsSection } from "./settings-ui";

export interface NotificationSettingsProps {
  matrix: Matrix;
  email: string;
  sms: { available: boolean; last4: string | null; verified: boolean; codeSent: boolean };
  pushAvailable: boolean;
}

export function NotificationSettings({
  matrix: initial,
  email,
  sms,
  pushAvailable,
}: NotificationSettingsProps) {
  const [matrix, setMatrix] = React.useState(initial);
  const [pushOn, setPushOn] = React.useState<boolean | null>(null);
  React.useEffect(() => setMatrix(initial), [initial]);
  React.useEffect(() => {
    if (!pushAvailable || !pushSupported()) return setPushOn(false);
    void currentPushSubscription().then((s) => setPushOn(Boolean(s)));
  }, [pushAvailable]);

  const columns = CHANNELS.filter((c) =>
    c === "sms" ? sms.available : c === "push" ? pushAvailable : true,
  );
  const usable = (c: Channel) =>
    c === "sms" ? sms.verified : c === "push" ? pushOn === true : true;

  async function toggle(kind: NotificationKind, channel: Channel, on: boolean) {
    setMatrix((m) => ({ ...m, [kind]: { ...m[kind], [channel]: on } }));
    const result = await saveNotificationPreference({ kind, channel, on });
    if (!result.ok) {
      setMatrix((m) => ({ ...m, [kind]: { ...m[kind], [channel]: !on } }));
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title="Notifications" description="Choose what reaches you, and where." />

      <section aria-labelledby="grid-title" className="flex flex-col gap-2">
        <h2
          id="grid-title"
          className="px-1 text-caption font-semibold tracking-wide text-ink-3 uppercase"
        >
          What you hear about
        </h2>
        <div className="overflow-hidden rounded-lg bg-surface ring-1 ring-line">
          <table className="w-full text-left">
            <caption className="sr-only">Notification preferences by type and channel</caption>
            <thead>
              <tr className="border-b border-line text-caption text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Notification</span>
                </th>
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="w-14 px-1 py-2.5 text-center font-medium sm:w-20"
                  >
                    {CHANNEL_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {NOTIFICATION_KINDS.map((kind) => (
                <tr key={kind}>
                  <th scope="row" className="px-4 py-3 align-top font-normal">
                    <span className="block text-body-sm font-medium text-ink">
                      {KIND_LABEL[kind]}
                    </span>
                    <span className="mt-0.5 hidden text-caption text-ink-3 sm:block">
                      {KIND_DESCRIPTION[kind]}
                    </span>
                  </th>
                  {columns.map((c) => (
                    <td key={c} className="px-1 py-3 text-center align-top">
                      <Checkbox
                        checked={matrix[kind][c] && usable(c)}
                        disabled={!usable(c)}
                        onCheckedChange={(v) => void toggle(kind, c, v === true)}
                        aria-label={`${KIND_LABEL[kind]}: ${CHANNEL_LABEL[c]}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-1 text-caption text-ink-3">
          Email goes to {email}. Texts and push wait until 8am if something comes in after 9pm
          Arizona time. Safety notices always reach you in the app.
        </p>
      </section>

      {sms.available ? <PhoneCard sms={sms} /> : null}
      {pushAvailable ? <PushCard on={pushOn} onChange={setPushOn} /> : null}
    </div>
  );
}

function PhoneCard({ sms }: { sms: NotificationSettingsProps["sms"] }) {
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [stage, setStage] = React.useState<"enter" | "code">(
    sms.codeSent && !sms.verified ? "code" : "enter",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    const r = await startPhoneVerification(phone);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setStage("code");
    toast.success(`Code sent to the number ending ${r.data.last4}`);
  }
  async function confirm() {
    setPending(true);
    setError(null);
    const r = await confirmPhoneVerification(code);
    setPending(false);
    if (!r.ok) return setError(r.error);
    toast.success("Texts are on for housing deadlines");
    setCode("");
    router.refresh();
  }
  async function remove() {
    setPending(true);
    const r = await removePhone();
    setPending(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Number removed. Texts are off.");
    setStage("enter");
    router.refresh();
  }

  return (
    <SettingsSection
      title="Text messages"
      footer="Msg and data rates may apply. Reply STOP to any text to opt out, or HELP for help. Your number is stored encrypted and never shown to anyone."
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
            <MessageSquareText className="size-[18px]" aria-hidden />
          </span>
          <p className="text-body-sm text-ink-2">
            {sms.verified
              ? `Texts go to the number ending ${sms.last4}. Pick which ones above.`
              : "Add a US mobile number to get texts for the notices you pick. We text a code to confirm it's yours."}
          </p>
        </div>
        {sms.verified ? (
          <Button
            variant="secondary"
            className="self-start"
            loading={pending}
            onClick={() => void remove()}
          >
            Remove number
          </Button>
        ) : stage === "enter" ? (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => (e.preventDefault(), void send())}
          >
            <Field
              label="Mobile number"
              error={error ?? undefined}
              className="min-w-[200px] flex-1"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(480) 555-0123"
                />
              )}
            </Field>
            <Button type="submit" loading={pending} disabled={!phone.trim()}>
              Text me a code
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => (e.preventDefault(), void confirm())}
          >
            <Field
              label="Six-digit code"
              hint="By confirming, you agree to get texts from Rumi for the notices you pick."
              error={error ?? undefined}
              className="min-w-[200px] flex-1"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
            <Button type="submit" loading={pending} disabled={code.length !== 6}>
              Confirm
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => (setStage("enter"), setError(null))}
            >
              Use another number
            </Button>
          </form>
        )}
      </div>
    </SettingsSection>
  );
}

function PushCard({ on, onChange }: { on: boolean | null; onChange: (on: boolean) => void }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const supported = typeof window !== "undefined" && pushSupported();

  async function flip() {
    setPending(true);
    const r = on ? await unsubscribePush() : await subscribePush();
    setPending(false);
    if (!r.ok) return toast.error(r.error);
    onChange(!on);
    toast.success(on ? "Push is off on this device" : "Push is on for messages and deadlines");
    router.refresh();
  }

  return (
    <SettingsSection
      title="Push on this device"
      footer="Push works in the installed app and in most desktop browsers. On iPhone, add Rumi to your Home Screen first."
    >
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
          <BellRing className="size-[18px]" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-body-sm text-ink-2">
          {!supported
            ? "This browser can't get push notifications."
            : on
              ? "This device gets push notifications."
              : "Get notified here even when Rumi isn't open."}
        </p>
        {supported ? (
          <Button
            variant={on ? "secondary" : "primary"}
            loading={pending || on === null}
            onClick={() => void flip()}
          >
            {on ? "Turn off" : "Turn on"}
          </Button>
        ) : null}
      </div>
    </SettingsSection>
  );
}
