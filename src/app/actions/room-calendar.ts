"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { CAMPUS_TZ } from "@/lib/time";
import { WEEKDAYS, buildWeeklyRule, guestLimitWarning, quietOverlaps } from "@/lib/calendar/room";
import { loadRoomContext, loadRoomEvents } from "@/lib/groups/room";
import { newShareRow, shareTokenFor } from "@/lib/share/server";

const uuid = z.string().uuid();
const iso = z.string().datetime({ offset: true });

const eventInput = z
  .object({
    groupId: uuid,
    kind: z.enum(["guest", "quiet", "away", "shared"]),
    title: z
      .string()
      .transform((v) => cleanText(v, { multiline: false }))
      .pipe(z.string().min(1, "Add a title.").max(120)),
    startsAt: iso,
    endsAt: iso,
    overnight: z.boolean(),
    guestCount: z.number().int().min(0).max(20),
    repeatDays: z.array(z.enum(WEEKDAYS)).max(7),
    repeatUntil: iso.nullable(),
    notes: z
      .string()
      .max(1000)
      .transform((v) => cleanText(v))
      .optional(),
  })
  .refine((e) => Date.parse(e.endsAt) > Date.parse(e.startsAt), {
    message: "End after it starts.",
    path: ["endsAt"],
  })
  .refine((e) => Date.parse(e.endsAt) - Date.parse(e.startsAt) <= 14 * 86_400_000, {
    message: "Keep events to two weeks or less.",
    path: ["endsAt"],
  })
  .refine((e) => e.kind === "guest" || (!e.overnight && e.guestCount === 0), {
    message: "Only guest events have guests.",
    path: ["kind"],
  })
  .refine((e) => !e.repeatUntil || Date.parse(e.repeatUntil) > Date.parse(e.startsAt), {
    message: "Repeat until a later date.",
    path: ["repeatUntil"],
  });

export type RoomEventInput = z.input<typeof eventInput>;

/** Soft checks before saving: never blocks, just tells everyone what the agreement says. */
export async function previewRoomEvent(
  raw: RoomEventInput,
): Promise<ActionResult<{ warnings: string[] }>> {
  const parsed = eventInput.safeParse(raw);
  if (!parsed.success) return ok({ warnings: [] });
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  const supabase = createClient();
  const [room, events] = await Promise.all([
    loadRoomContext(supabase, user.id, parsed.data.groupId),
    loadRoomEvents(supabase, parsed.data.groupId),
  ]);
  if (!room || !events) return fail("That room isn't available.");
  return ok({ warnings: warningsFor(parsed.data, events, room.overnightLimit) });
}

function warningsFor(
  e: z.output<typeof eventInput>,
  events: NonNullable<Awaited<ReturnType<typeof loadRoomEvents>>>,
  limit: number | null,
) {
  const target = {
    kind: e.kind,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    overnight: e.overnight,
    rrule: null,
  };
  const warnings: string[] = [];
  const guest = guestLimitWarning(target, events, limit, CAMPUS_TZ);
  if (guest) warnings.push(guest);
  for (const title of quietOverlaps(target, events))
    warnings.push(`It overlaps quiet hours: ${title}.`);
  return warnings;
}

export async function createRoomEvent(
  raw: RoomEventInput,
): Promise<ActionResult<{ warnings: string[] }>> {
  const parsed = eventInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const e = parsed.data;
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`room-calendar:${user.id}`, LIMITS.roomCalendarWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const supabase = createClient();
  const [room, events] = await Promise.all([
    loadRoomContext(supabase, user.id, e.groupId),
    loadRoomEvents(supabase, e.groupId),
  ]);
  if (!room || !events) return fail("That room isn't available.");
  if (events.length >= 500) return fail("This calendar is full. Remove some past events first.");
  const repeats = e.kind !== "guest" && e.repeatDays.length > 0;

  const { error } = await supabase.from("room_events").insert({
    group_id: e.groupId,
    created_by: user.id,
    kind: e.kind,
    title: e.title,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    overnight: e.kind === "guest" && e.overnight,
    guest_count: e.kind === "guest" ? e.guestCount : 0,
    rrule: repeats ? buildWeeklyRule(e.repeatDays, e.repeatUntil) : null,
    notes: e.notes || null,
  });
  if (error) return fail("Couldn't add that event.");
  revalidatePath(`/groups/${e.groupId}/calendar`);
  return ok({ warnings: warningsFor(e, events, room.overnightLimit) });
}

export async function deleteRoomEvent(groupId: string, eventId: string): Promise<ActionResult> {
  if (!uuid.safeParse(groupId).success || !uuid.safeParse(eventId).success)
    return fail("That event isn't available.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`room-calendar:${user.id}`, LIMITS.roomCalendarWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { data, error } = await createClient()
    .from("room_events")
    .delete()
    .eq("id", eventId)
    .eq("group_id", groupId)
    .eq("created_by", user.id)
    .select("id");
  if (error || !data?.length) return fail("Only the person who added an event can remove it.");
  revalidatePath(`/groups/${groupId}/calendar`);
  return ok();
}

/** The member's private feed URL. Created on first use; rotating replaces it. */
export async function calendarFeed(
  groupId: string,
  rotate = false,
): Promise<ActionResult<{ path: string }>> {
  if (!uuid.safeParse(groupId).success) return fail("That room isn't available.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("room_calendar_tokens")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing && !rotate)
    return ok({ path: `/api/calendar/${shareTokenFor("calendar", existing.id)}` });
  if (!(await rateLimit(`room-calendar:${user.id}`, LIMITS.roomCalendarWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");
  if (existing) await supabase.from("room_calendar_tokens").delete().eq("id", existing.id);
  const fresh = newShareRow("calendar");
  const { error } = await supabase.from("room_calendar_tokens").insert({
    id: fresh.id,
    group_id: groupId,
    user_id: user.id,
    token_hash: fresh.tokenHash,
    rotated_at: existing ? new Date().toISOString() : null,
  });
  if (error) return fail("Couldn't create your calendar link.");
  return ok({ path: `/api/calendar/${fresh.token}` });
}
