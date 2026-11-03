"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Check, ChevronLeft, Copy, Moon, Plane, Plus, RefreshCw, Repeat, Rss, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChoiceChips, MultiChips } from "@/components/ui/choice";
import { EmptyState } from "@/components/ui/empty-state";
import { calendarFeed, createRoomEvent, deleteRoomEvent, previewRoomEvent, type RoomEventInput } from "@/app/actions/room-calendar";
import { WEEKDAYS, campusLocalToIso, isoToCampusLocal, occurrences, type RoomEventKind, type Weekday } from "@/lib/calendar/room";
import { CAMPUS_TZ } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface CalendarEventView {
  id: string;
  kind: RoomEventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  overnight: boolean;
  guestCount: number;
  rrule: string | null;
  notes: string | null;
  createdBy: string;
}

const KIND: Record<RoomEventKind, { label: string; icon: React.ReactNode }> = {
  guest: { label: "Guest", icon: <UserRound className="size-4" strokeWidth={1.75} aria-hidden /> },
  quiet: { label: "Quiet / exams", icon: <Moon className="size-4" strokeWidth={1.75} aria-hidden /> },
  away: { label: "Away", icon: <Plane className="size-4" strokeWidth={1.75} aria-hidden /> },
  shared: { label: "Room event", icon: <Users className="size-4" strokeWidth={1.75} aria-hidden /> },
};

const DAY_LABEL: Record<Weekday, string> = { MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun" };
const WEEKS_SHOWN = 4;

const dayHeading = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: CAMPUS_TZ }).format(new Date(iso));
const timeOf = (iso: string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: CAMPUS_TZ }).format(new Date(iso));
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TZ }).format(new Date(iso));

export function RoomCalendarView({
  groupId,
  groupName,
  userId,
  events,
  memberNames,
  overnightLimit,
}: {
  groupId: string;
  groupName: string;
  userId: string;
  events: CalendarEventView[];
  memberNames: Record<string, string>;
  overnightLimit: number | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<RoomEventKind | "all">("all");
  const [adding, setAdding] = React.useState(false);
  const [feedOpen, setFeedOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);

  // Occurrences for the next few weeks, grouped by campus day. Computed after mount so the
  // server and client agree on "now".
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), []);
  const days = React.useMemo(() => {
    if (now === null) return [];
    const from = new Date(now - 86_400_000);
    const to = new Date(now + WEEKS_SHOWN * 7 * 86_400_000);
    const all = events
      .filter((e) => filter === "all" || e.kind === filter)
      .flatMap((e) => occurrences(e, from, to).map((o) => ({ ...o, event: e })))
      .filter((o) => Date.parse(o.endsAt) >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const grouped = new Map<string, typeof all>();
    for (const o of all) grouped.set(dayKey(o.startsAt), [...(grouped.get(dayKey(o.startsAt)) ?? []), o]);
    return [...grouped.values()];
  }, [events, filter, now]);

  async function remove(id: string) {
    setRemoving(id);
    const result = await deleteRoomEvent(groupId, id);
    setRemoving(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Event removed");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <div>
        <Link href={`/groups/${groupId}`} className="-ml-2 inline-flex h-9 items-center gap-1 rounded-full px-2 text-body-sm font-medium text-ink-2 hover:bg-surface-hover hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> {groupName}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-display-md text-ink lg:text-display-lg">Room calendar</h1>
            <p className="mt-1.5 text-body-sm text-ink-2">
              Guests, quiet hours, exams and time away, so nobody's surprised.{" "}
              {overnightLimit === null ? "Your agreement doesn't set a guest limit yet." : `Your agreement allows ${overnightLimit} overnight ${overnightLimit === 1 ? "guest" : "guests"} a week.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setFeedOpen(true)}>
              <Rss aria-hidden /> Subscribe
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add
            </Button>
          </div>
        </div>
      </div>

      <ChoiceChips
        aria-label="Show"
        value={filter}
        onValueChange={setFilter}
        options={[{ value: "all" as const, label: "Everything" }, ...(Object.keys(KIND) as RoomEventKind[]).map((k) => ({ value: k, label: KIND[k].label }))]}
      />

      {now !== null && days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays strokeWidth={1.75} />}
          title={filter === "all" ? "Nothing on the calendar" : `No ${KIND[filter].label.toLowerCase()} events coming up`}
          description="Add guests, quiet hours for exams, or days you'll be away. Everyone in the room sees it."
          action={<Button onClick={() => setAdding(true)}><Plus aria-hidden /> Add an event</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((list) => (
            <section key={list[0]!.startsAt} aria-label={dayHeading(list[0]!.startsAt)}>
              <h2 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">{dayHeading(list[0]!.startsAt)}</h2>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line">
                {list.map((o) => (
                  <li key={`${o.eventId}-${o.startsAt}`} className="flex items-start gap-3 p-4">
                    <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md", o.event.kind === "quiet" ? "bg-ink text-ink-inverse" : "bg-surface-sunken text-ink-2")}>
                      {KIND[o.event.kind].icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium text-ink">
                        {o.event.title}
                        {o.event.overnight ? <span className="ml-2 text-caption font-normal text-ink-3">Overnight</span> : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-2">
                        <span className="tabular-nums">{timeOf(o.startsAt)} – {timeOf(o.endsAt)}</span>
                        {o.event.rrule ? <span className="inline-flex items-center gap-1"><Repeat className="size-3" aria-hidden /> Weekly</span> : null}
                        <span>· {memberNames[o.event.createdBy] ?? "Former roommate"}</span>
                        {o.event.kind === "guest" && o.event.guestCount > 0 ? <span>· {o.event.guestCount} {o.event.guestCount === 1 ? "guest" : "guests"}</span> : null}
                      </p>
                      {o.event.notes ? <p className="mt-2 text-caption text-ink-2">{o.event.notes}</p> : null}
                    </div>
                    {o.event.createdBy === userId ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${o.event.title}`} loading={removing === o.eventId} onClick={() => void remove(o.eventId)}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AddEventSheet open={adding} onOpenChange={setAdding} groupId={groupId} onAdded={() => router.refresh()} />
      <FeedSheet open={feedOpen} onOpenChange={setFeedOpen} groupId={groupId} />
    </div>
  );
}

function defaultStart() {
  const d = new Date(Date.now() + 3_600_000);
  d.setUTCMinutes(0, 0, 0);
  return isoToCampusLocal(d.toISOString(), CAMPUS_TZ);
}

function AddEventSheet({ open, onOpenChange, groupId, onAdded }: { open: boolean; onOpenChange: (open: boolean) => void; groupId: string; onAdded: () => void }) {
  const [kind, setKind] = React.useState<RoomEventKind>("guest");
  const [title, setTitle] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [overnight, setOvernight] = React.useState(false);
  const [guests, setGuests] = React.useState("1");
  const [repeatDays, setRepeatDays] = React.useState<Weekday[]>([]);
  const [until, setUntil] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const s = defaultStart();
    setStart(s);
    setEnd(isoToCampusLocal(new Date(Date.parse(campusLocalToIso(s, CAMPUS_TZ)!) + 2 * 3_600_000).toISOString(), CAMPUS_TZ));
    setError(null);
    setWarnings([]);
  }, [open]);

  const input = (): RoomEventInput | null => {
    const startsAt = campusLocalToIso(start, CAMPUS_TZ);
    const endsAt = campusLocalToIso(end, CAMPUS_TZ);
    if (!startsAt || !endsAt) return null;
    return {
      groupId,
      kind,
      title,
      startsAt,
      endsAt,
      overnight: kind === "guest" && overnight,
      guestCount: kind === "guest" ? Math.max(0, Math.min(20, Number(guests) || 0)) : 0,
      repeatDays: kind === "guest" ? [] : repeatDays,
      repeatUntil: kind !== "guest" && repeatDays.length && until ? campusLocalToIso(`${until}T23:59`, CAMPUS_TZ) : null,
      notes,
    };
  };

  // Soft checks against the agreement as the details change.
  React.useEffect(() => {
    if (!open) return;
    const value = input();
    if (!value || !value.title.trim()) return setWarnings([]);
    const timer = window.setTimeout(() => {
      void previewRoomEvent(value).then((r) => r.ok && setWarnings(r.data.warnings));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- input() reads these values
  }, [open, kind, title, start, end, overnight, repeatDays, until]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = input();
    if (!value) return setError("Pick a start and end time.");
    setPending(true);
    setError(null);
    const result = await createRoomEvent(value);
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success("Added to the room calendar", result.data.warnings.length ? { description: result.data.warnings.join(" ") } : undefined);
    setTitle("");
    setNotes("");
    setOvernight(false);
    setRepeatDays([]);
    setUntil("");
    onOpenChange(false);
    onAdded();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add to the room calendar"
      description={`Times are ${CAMPUS_TZ.replace("_", " ").split("/").pop()} time.`}
      footer={
        <Button type="submit" form="room-event-form" block loading={pending}>
          Add event
        </Button>
      }
    >
      <form id="room-event-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="What is it?">
          {({ id }) => (
            <ChoiceChips aria-labelledby={id} value={kind} onValueChange={setKind} options={(Object.keys(KIND) as RoomEventKind[]).map((k) => ({ value: k, label: KIND[k].label }))} />
          )}
        </Field>
        <Field label="Title">{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={kind === "guest" ? "Sam visiting" : kind === "quiet" ? "Finals week" : kind === "away" ? "Home for the weekend" : "Room dinner"} required />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">{({ id }) => <Input id={id} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />}</Field>
          <Field label="Ends">{({ id }) => <Input id={id} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />}</Field>
        </div>
        {kind === "guest" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
              Staying overnight
              <Switch checked={overnight} onCheckedChange={setOvernight} aria-label="Staying overnight" />
            </label>
            <Field label="How many guests">{({ id }) => <Input id={id} type="number" inputMode="numeric" min={1} max={20} value={guests} onChange={(e) => setGuests(e.target.value)} />}</Field>
          </div>
        ) : (
          <Field label="Repeat weekly on" hint="Leave empty for a one-off.">
            {({ id }) => (
              <MultiChips aria-labelledby={id} value={repeatDays} onValueChange={setRepeatDays} options={WEEKDAYS.map((d) => ({ value: d, label: DAY_LABEL[d] }))} />
            )}
          </Field>
        )}
        {kind !== "guest" && repeatDays.length ? (
          <Field label="Until" hint="Optional. Repeats stop after this day.">{({ id }) => <Input id={id} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
        ) : null}
        <Field label="Notes" hint="Optional. Only your roommates see these.">{({ id }) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />}</Field>
        <div aria-live="polite">
          {warnings.length ? (
            <div className="flex gap-2.5 rounded-md bg-warning-soft p-3 text-body-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <div>
                {warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
                <p className="mt-1 text-caption text-ink-2">You can still add it. It's a heads-up, not a rule.</p>
              </div>
            </div>
          ) : null}
        </div>
        {error ? <p role="alert" className="text-body-sm text-danger">{error}</p> : null}
      </form>
    </Sheet>
  );
}

function FeedSheet({ open, onOpenChange, groupId }: { open: boolean; onOpenChange: (open: boolean) => void; groupId: string }) {
  const [path, setPath] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    void calendarFeed(groupId).then((r) => (r.ok ? setPath(r.data.path) : setError(r.error)));
  }, [open, groupId]);

  const url = path ? `${typeof window === "undefined" ? "" : window.location.origin}${path}` : "";

  async function rotate() {
    setPending(true);
    const r = await calendarFeed(groupId, true);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    setPath(r.data.path);
    toast.success("New link made. The old one stopped working.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Subscribe in your calendar app" description="Paste this private link into Google Calendar, Apple Calendar or Outlook (“add calendar from URL”). It's yours alone; don't share it.">
      <div className="flex flex-col gap-4" aria-live="polite">
        {error ? <p className="text-body-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Input readOnly value={url} aria-label="Private calendar link" onFocus={(e) => e.currentTarget.select()} />
          <Button variant="secondary" size="icon" aria-label="Copy link" disabled={!url} onClick={() => void copy()}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          </Button>
        </div>
        <Button variant="ghost" className="self-start" loading={pending} onClick={() => void rotate()}>
          <RefreshCw aria-hidden /> Make a new link
        </Button>
        <p className="text-caption text-ink-3">Leaving the group turns your link off.</p>
      </div>
    </Sheet>
  );
}
