"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CalendarDays,
  Plus,
  AlertTriangle,
  Clock,
  UserCheck,
  Moon,
  Plane,
  Users,
  Trash2,
  Share2,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  checkCalendarConflicts,
  type CalendarEvent,
} from "@/lib/calendar/conflicts";
import {
  createRoomEvent,
  deleteRoomEvent,
  getOrCreateCalendarToken,
  rotateCalendarToken,
  type CreateEventInput,
} from "@/app/actions/room-calendar";

export interface RoomEventRecord {
  id: string;
  group_id: string;
  created_by: string;
  kind: "guest" | "quiet" | "away" | "shared";
  title: string;
  starts_at: string;
  ends_at: string;
  overnight: boolean;
  guest_count: number;
  notes: string | null;
  created_at: string;
  creator_name?: string;
}

interface RoomCalendarViewProps {
  groupId: string;
  userId: string;
  events: RoomEventRecord[];
  memberNames: Record<string, string>;
}

export function RoomCalendarView({
  groupId,
  userId,
  events,
  memberNames,
}: RoomCalendarViewProps) {
  const [filter, setFilter] = React.useState<"all" | "guest" | "quiet" | "away" | "shared">("all");
  const [addSheetOpen, setAddSheetOpen] = React.useState(false);
  const [icalModalOpen, setIcalModalOpen] = React.useState(false);

  // Form state
  const [kind, setKind] = React.useState<"guest" | "quiet" | "away" | "shared">("guest");
  const [title, setTitle] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [overnight, setOvernight] = React.useState(false);
  const [guestCount, setGuestCount] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // iCal feed state
  const [icalUrl, setIcalUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);

  // Filtered events
  const filteredEvents = events.filter((e) => (filter === "all" ? true : e.kind === filter));

  // Real-time conflict preview in form
  const conflicts = React.useMemo(() => {
    if (!startsAt || !endsAt) return { hasWarning: false, warnings: [] };
    const calendarEvents: CalendarEvent[] = events.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      overnight: e.overnight,
      guestCount: e.guest_count,
    }));

    return checkCalendarConflicts(
      {
        kind,
        title: title || "New Event",
        startsAt,
        endsAt,
        overnight,
        guestCount,
      },
      calendarEvents,
    );
  }, [kind, title, startsAt, endsAt, overnight, guestCount, events]);

  async function handleOpenIcal() {
    setIcalModalOpen(true);
    const res = await getOrCreateCalendarToken(groupId);
    if (res.ok) {
      const fullUrl = typeof window !== "undefined"
        ? `${window.location.origin}${res.data.icsUrl}`
        : res.data.icsUrl;
      setIcalUrl(fullUrl);
    }
  }

  async function handleRotateIcal() {
    setIsRotating(true);
    try {
      const res = await rotateCalendarToken(groupId);
      if (res.ok) {
        const fullUrl = typeof window !== "undefined"
          ? `${window.location.origin}${res.data.icsUrl}`
          : res.data.icsUrl;
        setIcalUrl(fullUrl);
        toast("Calendar feed token rotated");
      }
    } finally {
      setIsRotating(false);
    }
  }

  async function handleCopyIcal() {
    if (!icalUrl) return;
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast("Feed link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Could not copy URL");
    }
  }

  async function handleSubmitEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) {
      toast("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRoomEvent({
        groupId,
        kind,
        title,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        overnight,
        guestCount,
        notes,
      });

      if (res.ok) {
        if (res.data.warnings && res.data.warnings.length > 0) {
          toast("Event added with note", {
            description: res.data.warnings.join(" "),
          });
        } else {
          toast("Event added to calendar");
        }
        setAddSheetOpen(false);
        setTitle("");
        setNotes("");
      } else {
        toast("Could not add event", { description: res.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Remove this event from the room calendar?")) return;
    const res = await deleteRoomEvent(groupId, id);
    if (res.ok) {
      toast("Event removed");
    } else {
      toast("Could not remove event", { description: res.error });
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-ink-2 hover:text-ink"
        >
          <ChevronLeft className="size-4" /> Back to room
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenIcal}
            className="inline-flex items-center gap-1.5"
          >
            <Share2 className="size-3.5 text-accent" />
            <span>Sync iCal</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setAddSheetOpen(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-white hover:opacity-90"
          >
            <Plus className="size-4" />
            <span>Add event</span>
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <h1 className="font-display text-display-md text-ink">Room Calendar</h1>
        <p className="mt-1 text-body-sm text-ink-2">
          Keep roommates in sync on upcoming visitors, overnight stays, and quiet study hours.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", "guest", "quiet", "away", "shared"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors ${
              filter === tab
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-hover"
            }`}
          >
            {tab === "all" ? "All events" : tab === "guest" ? "Guests" : tab === "quiet" ? "Quiet hours" : tab === "away" ? "Away" : "Shared"}
          </button>
        ))}
      </div>

      {/* Event List */}
      <div className="mt-6 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-2">
            <CalendarDays className="mx-auto size-8 text-ink-3" />
            <p className="mt-2 text-body font-semibold text-ink">No scheduled events</p>
            <p className="mt-1 text-caption text-ink-3">
              Add guests or quiet blocks to notify your roommates in advance.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setAddSheetOpen(true)}
            >
              Add first event
            </Button>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isCreator = ev.created_by === userId;
            const creatorName = memberNames[ev.created_by] || "Roommate";
            const startD = new Date(ev.starts_at);
            const endD = new Date(ev.ends_at);

            return (
              <div
                key={ev.id}
                className="relative flex items-start justify-between rounded-xl border border-line bg-surface p-4 shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      ev.kind === "guest"
                        ? "bg-amber-500/10 text-amber-600"
                        : ev.kind === "quiet"
                          ? "bg-indigo-500/10 text-indigo-600"
                          : ev.kind === "away"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-purple-500/10 text-purple-600"
                    }`}
                  >
                    {ev.kind === "guest" ? (
                      <UserCheck className="size-4" />
                    ) : ev.kind === "quiet" ? (
                      <Moon className="size-4" />
                    ) : ev.kind === "away" ? (
                      <Plane className="size-4" />
                    ) : (
                      <Users className="size-4" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-body font-semibold text-ink">{ev.title}</h4>
                      {ev.overnight ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-caption-xs font-semibold text-amber-700">
                          Overnight
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-caption text-ink-2">
                      <Clock className="size-3 text-ink-3" />
                      <span>
                        {startD.toLocaleDateString(undefined, { month: "short", day: "numeric" })} •{" "}
                        {startD.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} -{" "}
                        {endD.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="mt-1 text-caption-xs text-ink-3">
                      Added by {creatorName}
                      {ev.guest_count > 0 ? ` • ${ev.guest_count} guest${ev.guest_count > 1 ? "s" : ""}` : ""}
                    </div>

                    {ev.notes ? (
                      <p className="mt-2 rounded-lg bg-surface-sunken p-2 text-caption text-ink-2">
                        {ev.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                {isCreator ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(ev.id)}
                    aria-label="Remove event"
                    className="p-1 text-ink-3 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Add Event Sheet */}
      <Sheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        title="Schedule room event"
        description="Share upcoming visitors, quiet time, or trips with roommates."
        size="md"
      >
        <form onSubmit={handleSubmitEvent} className="space-y-4 py-2">
          {/* Event Kind Picker */}
          <div>
            <label className="text-body-xs font-semibold text-ink">Event type</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "guest", label: "Guest" },
                  { id: "quiet", label: "Quiet hours" },
                  { id: "away", label: "Away" },
                  { id: "shared", label: "Shared" },
                ] as const
              ).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`rounded-xl border p-2.5 text-caption font-medium transition-colors ${
                    kind === k.id
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-line bg-surface text-ink-2 hover:bg-surface-hover"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "guest"
                  ? "e.g. Sibling visiting from home"
                  : kind === "quiet"
                    ? "e.g. Chemistry exam study"
                    : kind === "away"
                      ? "e.g. Home for the weekend"
                      : "e.g. Room deep clean"
              }
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-body-xs font-semibold text-ink">Starts at</label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-body-xs font-semibold text-ink">Ends at</label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          {kind === "guest" ? (
            <div className="rounded-xl border border-line bg-surface-sunken p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-body-sm font-medium text-ink">Overnight stay</span>
                  <p className="text-caption-xs text-ink-3">Guest will be sleeping in the room</p>
                </div>
                <input
                  type="checkbox"
                  checked={overnight}
                  onChange={(e) => setOvernight(e.target.checked)}
                  className="size-4 rounded accent-accent"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-body-sm font-medium text-ink">Number of guests</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-center text-body-sm"
                />
              </div>
            </div>
          ) : null}

          {/* Real-time Agreement & Quiet Conflict Warning */}
          {conflicts.hasWarning ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="text-caption font-semibold text-amber-900">
                    Roommate agreement note
                  </p>
                  {conflicts.warnings.map((w, i) => (
                    <p key={i} className="text-caption text-amber-800">
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="text-body-xs font-semibold text-ink">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bringing sleeping bag, will be quiet after 11 PM"
              className="mt-1"
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding event..." : "Add to calendar"}
          </Button>
        </form>
      </Sheet>

      {/* iCal Feed Modal */}
      <Sheet
        open={icalModalOpen}
        onOpenChange={setIcalModalOpen}
        title="Sync Room Calendar"
        description="Subscribe to your room calendar from Apple Calendar, Google Calendar, or Outlook."
        size="md"
      >
        <div className="space-y-4 py-2">
          <p className="text-body-sm text-ink-2">
            Use this private link to see room events directly in your preferred calendar app. Updates sync automatically.
          </p>

          <div className="rounded-xl border border-line bg-surface-sunken p-3">
            <span className="text-caption-xs font-semibold uppercase tracking-wider text-ink-3">
              Private feed URL
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                readOnly
                value={icalUrl || "Generating feed..."}
                className="font-mono text-caption"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyIcal}
                disabled={!icalUrl}
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 space-y-2 text-caption text-ink-2">
            <p className="font-semibold text-ink">How to add:</p>
            <p>• <strong>Apple Calendar:</strong> File → New Calendar Subscription → Paste URL</p>
            <p>• <strong>Google Calendar:</strong> Other calendars (+) → From URL → Paste URL</p>
          </div>

          <div className="border-t border-line pt-2 text-right">
            <button
              type="button"
              onClick={handleRotateIcal}
              disabled={isRotating}
              className="inline-flex items-center gap-1 text-caption-xs text-ink-3 hover:text-ink"
            >
              <RefreshCw className={`size-3 ${isRotating ? "animate-spin" : ""}`} />
              Rotate feed link
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
