"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { suggestMeetingTimes, type MeetingSuggestions } from "@/app/actions/calendar";
import { CAMPUS_TZ } from "@/lib/time";

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("en-US", { timeZone: CAMPUS_TZ, ...options });

export function meetingLine(iso: string) {
  return `Does ${format(iso, { weekday: "short", month: "short", day: "numeric" })} at ${format(iso, { hour: "numeric", minute: "2-digit" })} work to meet?`;
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
        ? `Based on ${[
            state.data.basis.calendars
              ? `${state.data.basis.calendars} connected ${state.data.basis.calendars === 1 ? "calendar" : "calendars"}`
              : null,
            state.data.basis.schedules
              ? `${state.data.basis.schedules} class ${state.data.basis.schedules === 1 ? "schedule" : "schedules"}`
              : null,
          ]
            .filter(Boolean)
            .join(" and ")}. Nobody sees anyone else's calendar.`
        : "Nobody here has shared a calendar or class times yet, so these are just open daytime slots."
      : null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Find a time to meet"
      description="Pick one to drop it into your message."
    >
      <div className="flex flex-col gap-3 pb-2">
        {state.kind === "loading" ? (
          <div className="flex justify-center py-6 text-ink-3">
            <Spinner className="size-5" label="Finding times" />
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
                    onPick(meetingLine(slot.start));
                    onOpenChange(false);
                  }}
                >
                  <CalendarClock className="mr-2 size-4" aria-hidden />
                  {format(slot.start, { weekday: "long", month: "short", day: "numeric" })},{" "}
                  {format(slot.start, { hour: "numeric", minute: "2-digit" })}–
                  {format(slot.end, { hour: "numeric", minute: "2-digit" })}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-ink-2">No hour works for everyone in the next week.</p>
        )}
        {basis ? <p className="text-caption text-ink-3">{basis}</p> : null}
        <p className="text-caption text-ink-3">
          Add your calendar or class times in{" "}
          <Link href="/settings/accounts" className="text-accent-ink underline underline-offset-2">
            Connected accounts
          </Link>
          .
        </p>
      </div>
    </Sheet>
  );
}
