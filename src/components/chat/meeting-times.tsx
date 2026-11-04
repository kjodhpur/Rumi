"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { suggestMeetingTimes, type MeetingSuggestions } from "@/app/actions/calendar";
import { CAMPUS_TZ } from "@/lib/time";
import { useIntlLocale, useT, type Translator } from "@/components/providers/i18n";

const format = (iso: string, options: Intl.DateTimeFormatOptions, intl = "en-US") =>
  new Date(iso).toLocaleString(intl, { timeZone: CAMPUS_TZ, ...options });

export function meetingLine(iso: string, t: Translator<"chat">, intl = "en-US") {
  return t("meet.line", {
    day: format(iso, { weekday: "short", month: "short", day: "numeric" }, intl),
    time: format(iso, { hour: "numeric", minute: "2-digit" }, intl),
  });
}

/** Suggests times that suit everyone's shared calendars and class times (Phase 7.3a). */
export function MeetingTimes({
  conversationId,
  open,
  onOpenChange,
  onPick,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (line: string) => void;
}) {
  const t = useT("chat");
  const intl = useIntlLocale();
  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: MeetingSuggestions }
  >({ kind: "loading" });

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    setState({ kind: "loading" });
    void suggestMeetingTimes(conversationId).then((result) => {
      if (!live) return;
      setState(
        result.ok ? { kind: "ready", data: result.data } : { kind: "error", message: result.error },
      );
    });
    return () => {
      live = false;
    };
  }, [open, conversationId]);

  const basis =
    state.kind === "ready"
      ? state.data.basis.calendars || state.data.basis.schedules
        ? t("meet.basis", {
            sources: [
              state.data.basis.calendars
                ? t("meet.calendars", { count: state.data.basis.calendars })
                : null,
              state.data.basis.schedules
                ? t("meet.schedules", { count: state.data.basis.schedules })
                : null,
            ]
              .filter((x): x is string => Boolean(x))
              .reduce((a, b) => t("meet.and", { a, b })),
          })
        : t("meet.nothingShared")
      : null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t("meet.title")}
      description={t("meet.description")}
    >
      <div className="flex flex-col gap-3 pb-2">
        {state.kind === "loading" ? (
          <div className="flex justify-center py-6 text-ink-3">
            <Spinner className="size-5" label={t("meet.finding")} />
          </div>
        ) : state.kind === "error" ? (
          <p className="text-body-sm text-danger">{state.message}</p>
        ) : state.data.slots.length ? (
          <ul className="flex flex-col gap-2">
            {state.data.slots.map((slot) => (
              <li key={slot.start}>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    onPick(meetingLine(slot.start, t, intl));
                    onOpenChange(false);
                  }}
                >
                  <CalendarClock className="mr-2 size-4" aria-hidden />
                  {format(
                    slot.start,
                    { weekday: "long", month: "short", day: "numeric" },
                    intl,
                  )}, {format(slot.start, { hour: "numeric", minute: "2-digit" }, intl)}–
                  {format(slot.end, { hour: "numeric", minute: "2-digit" }, intl)}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-ink-2">{t("meet.none")}</p>
        )}
        {basis ? <p className="text-caption text-ink-3">{basis}</p> : null}
        <p className="text-caption text-ink-3">
          {t("meet.addYours")}{" "}
          <Link href="/settings/accounts" className="text-accent-ink underline underline-offset-2">
            {t("meet.accounts")}
          </Link>
          .
        </p>
      </div>
    </Sheet>
  );
}
