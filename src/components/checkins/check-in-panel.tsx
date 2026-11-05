"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, Phone } from "lucide-react";
import {
  reportMoveIn,
  requestRoomChange,
  submitCheckin,
  withdrawRoomChange,
} from "@/app/actions/checkins";
import { joinSwapPool, leaveSwapPool, respondToSwap } from "@/app/actions/room-swaps";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet } from "@/components/ui/sheet";
import { MultiChips } from "@/components/ui/choice";
import { GuidedMediation } from "@/components/retention/guided-mediation";
import { CHECKIN_TAGS, type CheckinTag } from "@/lib/retention/risk";
import type { CheckinHome } from "@/lib/checkins/load";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { cn } from "@/lib/utils";
import { useIntlLocale, useT } from "@/components/providers/i18n";
import { reasonLabel, riskReason } from "@/lib/i18n/checkins";

const date = (iso: string, intl: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(intl, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function CheckInPanel({ home }: { home: CheckinHome }) {
  const router = useRouter();
  const t = useT("checkins");
  const intl = useIntlLocale();
  const [pending, setPending] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [tags, setTags] = React.useState<CheckinTag[]>([]);
  const [note, setNote] = React.useState("");
  const [share, setShare] = React.useState(false);
  const [ask, setAsk] = React.useState(false);
  const [resources, setResources] = React.useState<{ crisis: boolean; threat: boolean } | null>(
    null,
  );
  const [changeOpen, setChangeOpen] = React.useState(false);

  async function act<T>(
    key: string,
    fn: () => Promise<{ ok: true; data?: T } | { ok: false; error: string }>,
    success?: string,
  ) {
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
    await act(
      "move",
      () =>
        reportMoveIn({
          building: String(form.get("building") ?? ""),
          room: String(form.get("room") ?? ""),
        }),
      t("moveInSaved"),
    );
  }

  async function submit(e: React.FormEvent, askOverride = false) {
    e.preventDefault();
    if (score === null) return void toast.error(t("pickScore"));
    setPending("submit");
    const result = await submitCheckin({
      score,
      tags,
      note,
      shareWithRa: share,
      askRa: ask || askOverride,
    });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    setResources(
      result.data.crisis || result.data.threat
        ? { crisis: result.data.crisis, threat: result.data.threat }
        : null,
    );
    toast.success(t(`risk.${result.data.level}.title`), {
      description: result.data.raNotified ? t("raNotified") : undefined,
    });
    setScore(null);
    setTags([]);
    setNote("");
    setAsk(false);
    router.refresh();
  }

  async function askRaNow() {
    setPending("ask");
    const last = home.history.at(-1);
    const result = await submitCheckin({
      score: last?.score ?? 3,
      tags: (
        home.latestTags.filter((tag) =>
          (CHECKIN_TAGS as readonly string[]).includes(tag),
        ) as CheckinTag[]
      ).slice(0, 2),
      shareWithRa: true,
      askRa: true,
    });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(result.data.raNotified ? t("raNotified") : t("savedFollowUp"));
    router.refresh();
  }

  if (!home.assignment) {
    return (
      <form
        action={moveIn}
        className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      >
        <div>
          <h2 className="text-body font-semibold text-ink">{t("movedIn")}</h2>
          <p className="mt-1 text-body-sm text-ink-2">{t("movedInBody")}</p>
        </div>
        <Field label={t("building")}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              name="building"
              required
              maxLength={80}
              placeholder={t("buildingPlaceholder")}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Field label={t("room")} hint={t("roomHint")}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              name="room"
              maxLength={40}
              placeholder="214"
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Button type="submit" loading={pending === "move"}>
          {t("saveMoveIn")}
        </Button>
      </form>
    );
  }

  const risk = home.risk;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-body-sm text-ink-2">
        {home.assignment.building}
        {home.assignment.room ? t("roomLine", { room: home.assignment.room }) : ""}
        {t("movedOn", { date: date(home.assignment.movedInAt, intl) })}
      </p>

      {resources ? (
        <div
          className="flex flex-col gap-2 rounded-xl bg-danger-soft p-4 text-body-sm text-ink"
          role="alert"
        >
          {resources.crisis ? (
            <p>
              {t("crisisLead")}{" "}
              <a href="tel:988" className="font-semibold underline underline-offset-4">
                988
              </a>{" "}
              {t("crisisTail")}
            </p>
          ) : null}
          {resources.threat ? (
            <p>
              {t("threatLead")}{" "}
              <a href="tel:911" className="font-semibold underline underline-offset-4">
                911
              </a>{" "}
              {t("threatMid", { police: LAUNCH_SCHOOL.police.name })}{" "}
              <a
                href={`tel:${LAUNCH_SCHOOL.police.phone.replace(/[^\d+]/g, "")}`}
                className="font-semibold underline underline-offset-4"
              >
                {LAUNCH_SCHOOL.police.phone}
              </a>
              .
            </p>
          ) : null}
          <p className="text-caption text-ink-2">{t("resourcesNote")}</p>
        </div>
      ) : null}

      {risk ? (
        <div
          className={cn(
            "rounded-xl p-4 ring-1",
            risk.level === "high" ? "bg-warning-soft ring-warning/30" : "bg-surface ring-line",
          )}
          aria-live="polite"
        >
          <p className="flex items-center gap-2 text-body font-semibold text-ink">
            {risk.level !== "low" ? (
              <AlertTriangle className="size-4 text-warning" aria-hidden />
            ) : null}
            {t(`risk.${risk.level}.title`)}
          </p>
          <p className="mt-1 text-body-sm text-ink-2">{t(`risk.${risk.level}.body`)}</p>
          {risk.reasons.length ? (
            <ul className="mt-2 list-disc pl-5 text-caption text-ink-2">
              {risk.reasons.map((r) => (
                <li key={r}>{riskReason(r, t)}</li>
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

      <form
        onSubmit={(e) => void submit(e)}
        className="flex flex-col gap-5 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        noValidate
      >
        <div>
          <h2 className="text-body font-semibold text-ink">
            {home.next ? t("dueOn", { date: date(home.next.dueOn, intl) }) : t("sendOne")}
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">{t("threeTaps")}</p>
        </div>
        <fieldset>
          <legend className="text-body-sm font-medium text-ink">{t("howGoing")}</legend>
          <div
            className="mt-2 grid grid-cols-5 gap-2"
            role="radiogroup"
            aria-label={t("scoreAria")}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={
                  n === 1 ? t("scoreRough", { n }) : n === 5 ? t("scoreGreat", { n }) : String(n)
                }
                onClick={() => setScore(n)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-md text-body font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  score === n
                    ? "bg-ink text-ink-inverse"
                    : "bg-surface-sunken text-ink ring-1 ring-line hover:bg-surface-hover",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-caption text-ink-3">
            <span>{t("rough")}</span>
            <span>{t("great")}</span>
          </div>
        </fieldset>
        <Field label={t("particular")} hint={t("upToTwo")}>
          {({ id }) => (
            <MultiChips
              aria-labelledby={id}
              value={tags}
              onValueChange={(v) => setTags(v.slice(-2))}
              options={CHECKIN_TAGS.map((tag) => ({ value: tag, label: t(`tags.${tag}`) }))}
            />
          )}
        </Field>
        <Field label={t("privateNote")} hint={t("privateNoteHint")}>
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <div className="flex flex-col divide-y divide-line rounded-md bg-surface-sunken">
          <label className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm text-ink">
            <span>
              {t("shareRa")}
              {!home.shareConsent ? (
                <span className="block text-caption text-ink-3">
                  {t("needsConsent")}{" "}
                  <Link href="/settings/privacy" className="underline underline-offset-4">
                    {t("privacy")}
                  </Link>
                  .
                </span>
              ) : null}
            </span>
            <Switch
              checked={share}
              onCheckedChange={setShare}
              disabled={!home.shareConsent}
              aria-label={t("shareAria")}
            />
          </label>
          <label className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm text-ink">
            <span>
              {t("askRa")}
              <span className="block text-caption text-ink-3">{t("askRaHint")}</span>
            </span>
            <Switch checked={ask} onCheckedChange={setAsk} aria-label={t("askRa")} />
          </label>
        </div>
        <Button type="submit" loading={pending === "submit"} disabled={score === null}>
          {t("send")}
        </Button>
      </form>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="room-change-title"
      >
        <h2
          id="room-change-title"
          className="flex items-center gap-2 text-body font-semibold text-ink"
        >
          <ArrowLeftRight className="size-4 text-ink-3" aria-hidden /> {t("roomChange")}
        </h2>
        {home.swapOffer ? (
          <div className="mt-3 rounded-md bg-accent-soft p-4" aria-live="polite">
            <p className="text-body-sm font-medium text-ink">{t("swapSuggested")}</p>
            <p className="mt-1 text-body-sm text-ink-2">
              {t("swapLead")}{" "}
              <span className="font-semibold text-ink tabular-nums">{home.swapOffer.newScore}</span>{" "}
              {t("swapTail", { current: home.swapOffer.currentScore })}
            </p>
            {home.swapOffer.answered ? (
              <p className="mt-3 text-caption text-ink-2">{t("saidYes")}</p>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  loading={pending === "swap-yes"}
                  onClick={() =>
                    void act(
                      "swap-yes",
                      () => respondToSwap(home.swapOffer!.id, true),
                      t("swapThanks"),
                    )
                  }
                >
                  {t("yesSwap")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pending === "swap-no"}
                  onClick={() =>
                    void act(
                      "swap-no",
                      () => respondToSwap(home.swapOffer!.id, false),
                      t("swapOff"),
                    )
                  }
                >
                  {t("noThanks")}
                </Button>
              </div>
            )}
          </div>
        ) : null}
        {home.roomChange ? (
          <>
            <p className="mt-1 text-body-sm text-ink-2">
              {t("asked", {
                reasons: home.roomChange.reasonKeys
                  .map((k) => {
                    const r = home.reasons.find((x) => x.key === k);
                    return r ? reasonLabel(r.key, r.label, t) : k;
                  })
                  .join(", "),
              })}
            </p>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
              <span>
                {t("lookSwap")}
                <span className="block text-caption text-ink-3">{t("lookSwapHint")}</span>
              </span>
              <Switch
                checked={home.roomChange.inSwapPool}
                disabled={pending === "swap"}
                onCheckedChange={(on) =>
                  void act(
                    "swap",
                    () => (on ? joinSwapPool() : leaveSwapPool()),
                    on ? t("inPool") : t("leftPool"),
                  )
                }
                aria-label={t("lookSwap")}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              loading={pending === "withdraw"}
              onClick={() => void act("withdraw", withdrawRoomChange, t("withdrawn"))}
            >
              {t("withdraw")}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-body-sm text-ink-2">{t("ifTalking")}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setChangeOpen(true)}
            >
              {t("askChange")}
            </Button>
          </>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-caption text-ink-3">
        <Phone className="size-3.5" aria-hidden />{" "}
        {t("emergencies", { police: LAUNCH_SCHOOL.police.name, phone: LAUNCH_SCHOOL.police.phone })}
      </p>

      <RoomChangeSheet
        open={changeOpen}
        onOpenChange={setChangeOpen}
        reasons={home.reasons}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function RoomChangeSheet({
  open,
  onOpenChange,
  reasons,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reasons: { key: string; label: string }[];
  onDone: () => void;
}) {
  const t = useT("checkins");
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
    toast.success(t("sheet.sent"));
    onDone();
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("askChange")}
      description={t("sheet.description")}
      footer={
        <Button type="submit" form="room-change-form" block loading={pending}>
          {t("sheet.submit")}
        </Button>
      }
    >
      <form id="room-change-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label={t("sheet.whatsGoing")} hint={t("sheet.upToThree")} error={error}>
          {({ id }) => (
            <MultiChips
              aria-labelledby={id}
              value={keys}
              onValueChange={(v) => setKeys(v.slice(-3))}
              options={reasons.map((r) => ({
                value: r.key,
                label: reasonLabel(r.key, r.label, t),
              }))}
            />
          )}
        </Field>
        <Field label={t("sheet.anythingElse")} hint={t("sheet.optional")}>
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}
