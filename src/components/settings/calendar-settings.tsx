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
import { useIntlLocale, useT } from "@/components/providers/i18n";

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

const STATUS = ["connected", "cancelled", "error", "unavailable", "busy"] as const;

export function CalendarSettings({ view, status }: { view: CalendarView; status?: string }) {
  const router = useRouter();
  const t = useT("accounts");
  const intl = useIntlLocale();
  const shown = React.useRef(false);
  React.useEffect(() => {
    const key = STATUS.find((s) => s === status);
    if (shown.current || !key) return;
    shown.current = true;
    const message = t(`calendar.status.${key}`);
    if (key === "connected") toast.success(message);
    else toast.error(message);
  }, [status, t]);

  async function disconnect(provider: string, label: string) {
    const result = await disconnectCalendar(provider);
    if (!result.ok) return toast.error(result.error);
    toast.success(t("calendar.disconnected", { provider: label }));
    router.refresh();
  }

  return (
    <>
      {view.providers.length ? (
        <SettingsSection title={t("calendar.title")} footer={t("calendar.footer")}>
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
                    <RelativeTime iso={p.lastSyncAt} prefix={t("calendar.lastChecked")} />
                  ) : p.connected ? (
                    t("calendar.notChecked")
                  ) : (
                    t("calendar.freeBusy")
                  )}
                </span>
              </span>
              {p.connected ? (
                <div className="flex items-center gap-2">
                  {p.lastError ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={`/api/calendar/connect/${p.provider}`}>
                        {t("calendar.reconnect")}
                        <span className="sr-only"> {p.label}</span>
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="success">{t("calendar.connected")}</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => void disconnect(p.provider, p.label)}
                  >
                    {t("calendar.disconnect")}
                    <span className="sr-only"> {p.label}</span>
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" variant="secondary">
                  <a href={`/api/calendar/connect/${p.provider}`}>
                    {t("calendar.connect")}
                    <span className="sr-only"> {p.label}</span>
                  </a>
                </Button>
              )}
            </div>
          ))}
        </SettingsSection>
      ) : null}

      <ClassSchedule schedule={view.schedule} />

      {view.dates.length ? (
        <SettingsSection title={t("calendar.dates")} footer={t("calendar.datesFooter")}>
          {view.dates.map((d) => (
            <div key={d.uid} className="flex items-center gap-3.5 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink">{d.title}</span>
                <span className="block text-caption text-ink-3">
                  {formatCalendarDate(
                    d.date,
                    { weekday: "short", month: "short", day: "numeric", year: "numeric" },
                    intl,
                  )}
                </span>
              </span>
              <Button asChild size="sm" variant="ghost">
                <a href={`/api/calendar/deadlines?uid=${encodeURIComponent(d.uid)}`} download>
                  <CalendarPlus className="mr-1.5 size-4" aria-hidden /> {t("calendar.add")}
                  <span className="sr-only">{t("calendar.addTo", { title: d.title })}</span>
                </a>
              </Button>
            </div>
          ))}
          {view.dates.length > 1 ? (
            <div className="px-4 py-3">
              <Button asChild size="sm" variant="secondary">
                <a href="/api/calendar/deadlines" download>
                  <CalendarPlus className="mr-1.5 size-4" aria-hidden /> {t("calendar.addAll")}
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
  const t = useT("accounts");
  const dayNames = DAY_NAMES.map((_, n) => t(`calendar.days.d${n}` as "calendar.days.d0"));
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
    done(result.data.blocks.length ? t("calendar.saved") : t("calendar.cleared"));
  }

  async function importFeed() {
    setPending("feed");
    const result = await importClassFeed(feed);
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    setFeed("");
    done(t("calendar.found", { count: result.data.blocks.length }));
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
    done(t("calendar.found", { count: result.data.blocks.length }));
  }

  async function refresh() {
    setPending("refresh");
    const result = await refreshClassFeed();
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows(result.data.blocks);
    done(t("calendar.updated"));
  }

  async function remove() {
    setPending("remove");
    const result = await removeClassSchedule();
    setPending(null);
    if (!result.ok) return toast.error(result.error);
    setRows([]);
    done(t("calendar.removed"));
  }

  const update = (i: number, patch: Partial<ClassBlock>) =>
    setRows((current) => current.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <SettingsSection title={t("calendar.classes")} footer={t("calendar.classesFooter")}>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
            <GraduationCap className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-ink">
              {has ? t("calendar.yourClasses") : t("calendar.noClasses")}
            </p>
            {has ? (
              <ul className="mt-1 flex flex-col gap-0.5 text-caption text-ink-2">
                {summarizeBlocks(schedule.blocks, dayNames).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-ink-3">{t("calendar.noClassesHint")}</p>
            )}
            {schedule.lastError ? (
              <p className="mt-1 text-caption text-danger">{schedule.lastError}</p>
            ) : schedule.source === "ics" && schedule.lastSyncAt ? (
              <p className="mt-1 text-caption text-ink-3">
                <RelativeTime iso={schedule.lastSyncAt} prefix={t("calendar.importedAgo")} />
              </p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label={t("calendar.classDay", { n: i + 1 })}
                  value={row.day}
                  onChange={(e) => update(i, { day: Number(e.target.value) })}
                  className="w-28"
                >
                  {dayNames.map((d, n) => (
                    <option key={n} value={n}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Input
                  type="time"
                  aria-label={t("calendar.classStarts", { n: i + 1 })}
                  value={row.start}
                  onChange={(e) => update(i, { start: e.target.value })}
                  className="w-32"
                />
                <span className="text-caption text-ink-3" aria-hidden>
                  {t("calendar.to")}
                </span>
                <Input
                  type="time"
                  aria-label={t("calendar.classEnds", { n: i + 1 })}
                  value={row.end}
                  onChange={(e) => update(i, { end: e.target.value })}
                  className="w-32"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("calendar.removeClass", { n: i + 1 })}
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
                <Plus className="mr-1 size-4" aria-hidden /> {t("calendar.addClass")}
              </Button>
              <Button size="sm" onClick={() => void save()} loading={pending === "save"}>
                {t("calendar.saveClasses")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRows(schedule.blocks);
                  setEditing(false);
                }}
              >
                {t("calendar.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {has ? t("calendar.editHand") : t("calendar.addHand")}
            </Button>
            {schedule.hasFeed ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void refresh()}
                loading={pending === "refresh"}
              >
                <RefreshCw className="mr-1 size-4" aria-hidden /> {t("calendar.refreshFeed")}
              </Button>
            ) : null}
            {has ? (
              <Button
                size="sm"
                variant="danger-ghost"
                onClick={() => void remove()}
                loading={pending === "remove"}
              >
                {t("calendar.removeSchedule")}
              </Button>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor="class-feed" className="text-body-sm font-medium text-ink">
            {t("calendar.importLink")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="class-feed"
              type="url"
              inputMode="url"
              placeholder={t("calendar.feedPlaceholder")}
              value={feed}
              onChange={(e) => setFeed(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => void importFeed()}
              loading={pending === "feed"}
              disabled={!feed.trim()}
            >
              {t("calendar.import")}
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
              {t("calendar.upload")}
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
