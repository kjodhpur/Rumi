"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { checkCalendarConflicts, type CalendarEvent } from "@/lib/calendar/conflicts";
import { generateRawShareToken, hashShareToken } from "@/lib/share/token";

const uuidSchema = z.string().uuid();

export interface CreateEventInput {
  groupId: string;
  kind: "guest" | "quiet" | "away" | "shared";
  title: string;
  startsAt: string;
  endsAt: string;
  overnight: boolean;
  guestCount: number;
  notes?: string;
}

export async function createRoomEvent(
  input: CreateEventInput,
): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(input.groupId).success) return fail("Invalid group ID.");
  if (!input.title.trim()) return fail("Event title is required.");

  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return fail("Invalid event dates.");
  }
  if (end < start) {
    return fail("End time must be after start time.");
  }

  const supabase = createClient();

  // Load existing events to evaluate conflicts
  const { data: existingData, error: loadError } = await supabase
    .from("room_events")
    .select("id, kind, title, starts_at, ends_at, overnight, guest_count")
    .eq("group_id", input.groupId);

  if (loadError) return fail(loadError.message);

  const existingEvents: CalendarEvent[] = (existingData || []).map((e) => ({
    id: e.id,
    kind: e.kind as CalendarEvent["kind"],
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    overnight: e.overnight,
    guestCount: e.guest_count,
  }));

  const conflicts = checkCalendarConflicts(
    {
      kind: input.kind,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      overnight: input.overnight,
      guestCount: input.guestCount,
    },
    existingEvents,
  );

  const { data: inserted, error: insertError } = await supabase
    .from("room_events")
    .insert({
      group_id: input.groupId,
      created_by: user.id,
      kind: input.kind,
      title: input.title.trim(),
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      overnight: input.overnight,
      guest_count: input.guestCount,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (insertError) return fail(insertError.message);

  revalidatePath(`/groups/${input.groupId}/calendar`);
  return ok({ id: inserted.id, warnings: conflicts.warnings });
}

export async function deleteRoomEvent(
  groupId: string,
  eventId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success || !uuidSchema.safeParse(eventId).success) {
    return fail("Invalid ID.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("room_events")
    .delete()
    .eq("id", eventId)
    .eq("group_id", groupId)
    .eq("created_by", user.id);

  if (error) return fail(error.message);

  revalidatePath(`/groups/${groupId}/calendar`);
  return ok();
}

export async function getOrCreateCalendarToken(
  groupId: string,
): Promise<ActionResult<{ token: string; icsUrl: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success) return fail("Invalid group ID.");

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("room_calendar_tokens")
    .select("token")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return ok({
      token: existing.token,
      icsUrl: `/api/calendar/${existing.token}.ics`,
    });
  }

  const rawToken = generateRawShareToken();
  const tokenHash = hashShareToken(rawToken);

  const { error } = await supabase.from("room_calendar_tokens").insert({
    group_id: groupId,
    user_id: user.id,
    token: rawToken,
    token_hash: tokenHash,
  });

  if (error) return fail(error.message);

  return ok({
    token: rawToken,
    icsUrl: `/api/calendar/${rawToken}.ics`,
  });
}

export async function rotateCalendarToken(
  groupId: string,
): Promise<ActionResult<{ token: string; icsUrl: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success) return fail("Invalid group ID.");

  const supabase = createClient();
  const rawToken = generateRawShareToken();
  const tokenHash = hashShareToken(rawToken);

  const { error } = await supabase
    .from("room_calendar_tokens")
    .update({
      token: rawToken,
      token_hash: tokenHash,
      rotated_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return fail(error.message);

  return ok({
    token: rawToken,
    icsUrl: `/api/calendar/${rawToken}.ics`,
  });
}
