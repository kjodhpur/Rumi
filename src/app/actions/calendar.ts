"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { CONSENT_VERSION } from "@/lib/consent";
import { decrypt, encrypt } from "@/lib/crypto";
import { CAMPUS_TZ } from "@/lib/time";
import { runInBackground } from "@/lib/background";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { busyFor, isCalendarProvider, revokeCalendar } from "@/lib/calendar/oauth";
import { FeedError, fetchCalendarFeed } from "@/lib/calendar/fetch-feed";
import {
  classBlocksSchema,
  normalizeBlocks,
  parseClassIcs,
  type ClassBlock,
} from "@/lib/calendar/class-schedule";
import { suggestSlots, type Interval } from "@/lib/calendar/free-slots";
import type { Json } from "@/types/database";

/** Deletes the connection (and revokes Google's token). The last one off revokes the consent. */
export async function disconnectCalendar(provider: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isCalendarProvider(provider)) return fail("Couldn't disconnect.");
  if (!(await rateLimit(`calendar-connect:${user.id}`, LIMITS.calendarConnectsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  await revokeCalendar(user.id, provider);
  const { count } = await createAdminClient()
    .from("calendar_accounts")
    .select("provider", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!count)
    await createClient().rpc("set_consent", {
      p_kind: "calendar",
      p_granted: false,
      p_version: CONSENT_VERSION,
    });
  revalidatePath("/settings/accounts");
  revalidatePath("/settings/privacy");
  return ok();
}

// ── Class schedule (7.4) ────────────────────────────────────────────────────

async function saveSchedule(
  userId: string,
  row: { source: "manual" | "ics"; blocks: ClassBlock[]; ics_url_enc?: string | null },
) {
  const { error } = await createAdminClient()
    .from("class_schedules")
    .upsert({
      user_id: userId,
      source: row.source,
      blocks: row.blocks as unknown as NonNullable<Json>,
      ics_url_enc: row.ics_url_enc ?? null,
      last_sync_at: row.source === "ics" ? new Date().toISOString() : null,
      last_error: null,
      updated_at: new Date().toISOString(),
    });
  if (error) return false;
  runInBackground("recompute-classes", () => recomputeMatchesFor(userId));
  revalidatePath("/settings/accounts");
  return true;
}

type Guard = { userId: string; error?: undefined } | { userId?: undefined; error: string };

async function scheduleGuard(): Promise<Guard> {
  const user = await getUser();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit(`class-schedule:${user.id}`, LIMITS.classScheduleChangesPerHour)))
    return { error: "Too many changes. Try again in a bit." };
  return { userId: user.id };
}

export async function saveClassBlocks(
  input: ClassBlock[],
): Promise<ActionResult<{ blocks: ClassBlock[] }>> {
  const parsed = classBlocksSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your class times.");
  const guard = await scheduleGuard();
  if (guard.error !== undefined) return fail(guard.error);
  const blocks = normalizeBlocks(parsed.data);
  if (!(await saveSchedule(guard.userId, { source: "manual", blocks })))
    return fail("Couldn't save. Try again.");
  return ok({ blocks });
}

const feedUrl = z.string().trim().min(10).max(2000);

/** Imports weekly class times from a calendar feed link (e.g. Canvas → Calendar Feed). */
export async function importClassFeed(
  raw: string,
): Promise<ActionResult<{ blocks: ClassBlock[] }>> {
  if (!feedUrl.safeParse(raw).success) return fail("Paste the calendar feed link.");
  const guard = await scheduleGuard();
  if (guard.error !== undefined) return fail(guard.error);
  let blocks: ClassBlock[];
  try {
    blocks = parseClassIcs(await fetchCalendarFeed(raw), CAMPUS_TZ);
  } catch (error) {
    return fail(error instanceof FeedError ? error.message : "Couldn't read that calendar.");
  }
  if (!blocks.length)
    return fail("We didn't find weekly class times in that calendar. You can add them by hand.");
  if (
    !(await saveSchedule(guard.userId, {
      source: "ics",
      blocks,
      ics_url_enc: encrypt(raw.trim()),
    }))
  )
    return fail("Couldn't save. Try again.");
  return ok({ blocks });
}

/** Imports from an uploaded .ics file; the file itself isn't kept. */
export async function importClassFile(
  form: FormData,
): Promise<ActionResult<{ blocks: ClassBlock[] }>> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("Choose an .ics file.");
  if (file.size > 2 * 1024 * 1024) return fail("That file is too big. Calendars are under 2 MB.");
  const guard = await scheduleGuard();
  if (guard.error !== undefined) return fail(guard.error);
  const text = await file.text();
  if (!text.includes("BEGIN:VCALENDAR")) return fail("That isn't an .ics calendar file.");
  const blocks = parseClassIcs(text, CAMPUS_TZ);
  if (!blocks.length)
    return fail("We didn't find weekly class times in that file. You can add them by hand.");
  if (!(await saveSchedule(guard.userId, { source: "ics", blocks })))
    return fail("Couldn't save. Try again.");
  return ok({ blocks });
}

/** Re-reads a saved feed link (class times change at the start of a term). */
export async function refreshClassFeed(): Promise<ActionResult<{ blocks: ClassBlock[] }>> {
  const guard = await scheduleGuard();
  if (guard.error !== undefined) return fail(guard.error);
  const db = createAdminClient();
  const { data } = await db
    .from("class_schedules")
    .select("ics_url_enc")
    .eq("user_id", guard.userId)
    .maybeSingle();
  if (!data?.ics_url_enc) return fail("There's no feed link to refresh.");
  const url = decrypt(data.ics_url_enc);
  try {
    const blocks = parseClassIcs(await fetchCalendarFeed(url), CAMPUS_TZ);
    if (!blocks.length) throw new FeedError("No weekly class times in the feed anymore.");
    if (
      !(await saveSchedule(guard.userId, { source: "ics", blocks, ics_url_enc: data.ics_url_enc }))
    )
      return fail("Couldn't save. Try again.");
    return ok({ blocks });
  } catch (error) {
    const message = error instanceof FeedError ? error.message : "Couldn't read that calendar.";
    await db
      .from("class_schedules")
      .update({ last_error: message.slice(0, 300) })
      .eq("user_id", guard.userId);
    revalidatePath("/settings/accounts");
    return fail(message);
  }
}

export async function removeClassSchedule(): Promise<ActionResult> {
  const guard = await scheduleGuard();
  if (guard.error !== undefined) return fail(guard.error);
  await createAdminClient().from("class_schedules").delete().eq("user_id", guard.userId);
  runInBackground("recompute-classes", () => recomputeMatchesFor(guard.userId));
  revalidatePath("/settings/accounts");
  return ok();
}

// ── Find a time to meet (7.3a) ──────────────────────────────────────────────

export interface MeetingSuggestions {
  slots: { start: string; end: string }[];
  /** How many people in the chat shared calendars or class times. */
  basis: { members: number; calendars: number; schedules: number };
}

/**
 * Times that work for everyone in a conversation, from the calendars and class times its
 * members chose to share. Returns only the suggestions, never anyone's busy times.
 */
export async function suggestMeetingTimes(
  conversationId: string,
): Promise<ActionResult<MeetingSuggestions>> {
  const user = await getUser();
  if (!user || !z.string().uuid().safeParse(conversationId).success)
    return fail("Couldn't find times.");
  if (!(await rateLimit(`calendar-suggest:${user.id}`, LIMITS.calendarSuggestionsPerHour)))
    return fail("Try again in a bit.");
  // RLS: only members can see the member list.
  const { data: members } = await createClient()
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (!ids.includes(user.id)) return fail("Couldn't find times.");

  const db = createAdminClient();
  const [{ data: consents }, { data: schedules }] = await Promise.all([
    db
      .from("consents")
      .select("user_id")
      .in("user_id", ids)
      .eq("kind", "calendar")
      .is("revoked_at", null),
    db.from("class_schedules").select("user_id, blocks").in("user_id", ids),
  ]);
  const consented = new Set((consents ?? []).map((c) => c.user_id));
  const now = Date.now();
  const from = new Date(now);
  const to = new Date(now + 7 * 86_400_000);

  const busy: Interval[] = [];
  let calendars = 0;
  for (const id of ids.filter((i) => consented.has(i))) {
    const intervals = await busyFor(id, from, to);
    if (intervals) {
      calendars += 1;
      busy.push(...intervals);
    }
  }
  const classes: ClassBlock[] = [];
  for (const s of schedules ?? []) {
    const parsed = classBlocksSchema.safeParse(s.blocks);
    if (parsed.success) classes.push(...parsed.data);
  }

  const slots = suggestSlots(busy, classes, { now, timeZone: CAMPUS_TZ });
  return ok({
    slots: slots.map((s) => ({
      start: new Date(s.start).toISOString(),
      end: new Date(s.end).toISOString(),
    })),
    basis: { members: ids.length, calendars, schedules: schedules?.length ?? 0 },
  });
}
