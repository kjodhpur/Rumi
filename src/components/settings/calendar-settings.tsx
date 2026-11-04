"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, GraduationCap, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  disconnectCalendar,
  importClassFeed,
  importClassFile,
  refreshClassFeed,
  removeClassSchedule,
  saveClassBlocks,
} from "@/app/actions/calendar";
import { DAY_NAMES, summarizeBlocks, type ClassBlock } from "@/lib/calendar/class-schedule";
import { formatCalendarDate } from "@/lib/time";
import { SettingsSection } from "./settings-ui";

export interface CalendarView {
  providers: {
    provider: "google" | "microsoft";
    label: string;
    connected: boolean;
    lastSyncAt: string | null;
    lastError: string | null;
  }[];
  schedule: {
    source: "manual" | "ics" | null;
    blocks: ClassBlock[];
    hasFeed: boolean;
    lastSyncAt: string | null;
    lastError: string | null;
  };
  dates: { uid: string; title: string; date: string }[];
}

const STATUS: Record<string, [kind: "success" | "error", message: string]> = {
  connected: ["success", "Calendar connected. Rumi only reads when you're busy."],
  cancelled: ["error", "Calendar connection cancelled."],
  error: ["error", "Couldn't connect your calendar. Try again."],
  unavailable: ["error", "Calendar connections aren't available right now."],
  busy: ["error", "Too many tries. Wait a few minutes and try again."],
};

export function CalendarSettings({ view, status }: { view: CalendarView; status?: string }) {
  const router = useRouter();
  const shown = React.useRef(false);
  React.useEffect(() => {
    if (shown.current || !status || !STATUS[status]) return;
    shown.current = true;
    const [kind, message] = STATUS[status];
    if (kind === "success") toast.success(message);
    else toast.error(message);
  }, [status]);

  async function disconnect(provider: string, label: string) {
    const result = await disconnectCalendar(provider);
    if (!result.ok) return toast.error(result.error);
    toast.success(`${label} disconnected. We deleted the connection.`);
    router.refresh();
  }

  return (
    <>
      {view.providers.length ? (
        <SettingsSection
          title="Calendar"
          footer="Read-only: Rumi sees only when you're busy, never event names or details, and uses it to suggest times to meet in your chats. Others only see the suggested times. Disconnecting deletes the connection."
        >
          {view.providers.map((p) => (
            <div key={p.provider} className="flex items-center gap-3.5 px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
                <CalendarDays className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink">{p.label}</span>
                <span className="block text-caption text-ink-3">
                  {p.lastError ? (
                    <span className="text-danger">{p.lastError}</span>
                  ) : p.connected && p.lastSyncAt ? (
                    <RelativeTime iso={p.lastSyncAt} prefix="Last checked " />
                  ) : p.connected ? (
                    "Not checked yet"
                  ) : (
                    "Free/busy only"
                  )}
                </span>
              </span>
              {p.connected ? (
                <div className="flex items-center gap-2">
                  {p.lastError ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={`/api/calendar/connect/${p.provider}`}>
                        Reconnect<span className="sr-only"> {p.label}</span>
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="success">Connected</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => void disconnect(p.provider, p.label)}
                  >
                    Disconnect<span className="sr-only"> {p.label}</span>
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" variant="secondary">
                  <a href={`/api/calendar/connect/${p.provider}`}>
                    Connect<span className="sr-only"> {p.label}</span>
                  </a>
                </Button>
              )}
            </div>
          ))}
        </SettingsSection>
      ) : null}

      <ClassSchedule schedule={view.schedule} />

      {view.dates.length ? (
        <SettingsSection
          title="Housing dates"
          footer="Adds an all-day event to your calendar app. Dates come from your housing office and your profile."
        >
          {view.dates.map((d) => (
            <div key={d.uid} className="flex items-center gap-3.5 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink">{d.title}</span>
                <span className="block text-caption text-ink-3">
                  {formatCalendarDate(d.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </span>
              <Button asChild size="sm" variant="ghost">
                <a href={`/api/calendar/deadlines?uid=${encodeURIComponent(d.uid)}`} download>
                  <CalendarPlus className="mr-1.5 size-4" aria-hidden /> Add
                  <span className="sr-only"> {d.title} to my calendar</span>
                </a>
              </Button>
            </div>
          ))}
          {view.dates.length > 1 ? (
            <div className="px-4 py-3">
              <Button asChild size="sm" variant="secondary">
                <a href="/api/calendar/deadlines" download>
                  <CalendarPlus className="mr-1.5 size-4" aria-hidden /> Add all to my calendar
                </a>
              </Button>
            </div>
          ) : null}
        </SettingsSection>
      ) : null}
    </>
  );
}

function ClassSchedule({ schedule }: { schedule: CalendarView["schedule"] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<ClassBlock[]>(schedule.blocks);
  const [feed, setFeed] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const has = schedule.blocks.length > 0;

  function done(message: string) {
    toast.success(message);
    setEditing(false);
    router.refresh();
  }

  async function save() {
    setPending("save");
    const result = await saveClassBlocks(rows);
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    done(result.data.blocks.length ? "Class times saved" : "Class times cleared");
  }

  async function importFeed() {
    setPending("feed");
    const result = await importClassFeed(feed);
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    setFeed("");
    done(
      `Found ${result.data.blocks.length} weekly class ${result.data.blocks.length === 1 ? "time" : "times"}`,
    );
  }

  async function importFile(file: File) {
    const form = new FormData();
    form.set("file", file);
    setPending("file");
    const result = await importClassFile(form);
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    done(
      `Found ${result.data.blocks.length} weekly class ${result.data.blocks.length === 1 ? "time" : "times"}`,
    );
  }

  async function refresh() {
    setPending("refresh");
    const result = await refreshClassFeed();
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    done("Class times updated from your feed");
  }

  async function remove() {
    setPending("remove");
    const result = await removeClassSchedule();
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows([]);
    done("Class schedule removed");
  }

  const update = (i: number, patch: Partial<ClassBlock>) =>
    setRows((current) => current.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <SettingsSection
      title="Class schedule"
      footer="Optional. Your class days are a small matching factor (early classes vs. late) and keep suggested meeting times clear of class. Only days and times are kept, no course names. In Canvas: Calendar → Calendar Feed, then copy the link."
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
            <GraduationCap className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-ink">
              {has ? "Your weekly classes" : "No class times yet"}
            </p>
            {has ? (
              <ul className="mt-1 flex flex-col gap-0.5 text-caption text-ink-2">
                {summarizeBlocks(schedule.blocks).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-ink-3">Add them by hand or import a calendar.</p>
            )}
            {schedule.lastError ? (
              <p className="mt-1 text-caption text-danger">{schedule.lastError}</p>
            ) : schedule.source === "ics" && schedule.lastSyncAt ? (
              <p className="mt-1 text-caption text-ink-3">
                <RelativeTime iso={schedule.lastSyncAt} prefix="Imported " />
              </p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label={`Class ${i + 1} day`}
                  value={row.day}
                  onChange={(e) => update(i, { day: Number(e.target.value) })}
                  className="w-28"
                >
                  {DAY_NAMES.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Input
                  type="time"
                  aria-label={`Class ${i + 1} starts`}
                  value={row.start}
                  onChange={(e) => update(i, { start: e.target.value })}
                  className="w-32"
                />
                <span className="text-caption text-ink-3" aria-hidden>
                  to
                </span>
                <Input
                  type="time"
                  aria-label={`Class ${i + 1} ends`}
                  value={row.end}
                  onChange={(e) => update(i, { end: e.target.value })}
                  className="w-32"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove class ${i + 1}`}
                  onClick={() => setRows((current) => current.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setRows((current) => [...current, { day: 0, start: "09:00", end: "10:15" }])
                }
              >
                <Plus className="mr-1 size-4" aria-hidden /> Add a class time
              </Button>
              <Button size="sm" onClick={() => void save()} loading={pending === "save"}>
                Save class times
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRows(schedule.blocks);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {has ? "Edit by hand" : "Add by hand"}
            </Button>
            {schedule.hasFeed ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void refresh()}
                loading={pending === "refresh"}
              >
                <RefreshCw className="mr-1 size-4" aria-hidden /> Refresh from feed
              </Button>
            ) : null}
            {has ? (
              <Button
                size="sm"
                variant="danger-ghost"
                onClick={() => void remove()}
                loading={pending === "remove"}
              >
                Remove schedule
              </Button>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor="class-feed" className="text-body-sm font-medium text-ink">
            Import from a calendar link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="class-feed"
              type="url"
              inputMode="url"
              placeholder="https://… .ics or webcal://…"
              value={feed}
              onChange={(e) => setFeed(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => void importFeed()}
              loading={pending === "feed"}
              disabled={!feed.trim()}
            >
              Import
            </Button>
          </div>
          <div>
            <input
              ref={fileRef}
              id="class-file"
              type="file"
              accept=".ics,text/calendar"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              loading={pending === "file"}
            >
              Or upload an .ics file
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
