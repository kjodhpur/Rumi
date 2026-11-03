import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { agreementOvernightLimit } from "@/lib/calendar/room";
import type { RoomEvent } from "@/lib/calendar/room";

export interface RoomMember {
  id: string;
  firstName: string;
}

export interface RoomContext {
  groupId: string;
  name: string;
  members: RoomMember[];
  /** Overnight guests per week from the signed (or draft) agreement; null when it says nothing. */
  overnightLimit: number | null;
  agreementStatus: "draft" | "signed" | "reopened" | "void" | null;
}

/** The room hub's context for a member, or null if the viewer isn't in the group (RLS). */
export async function loadRoomContext(supabase: ServerSupabase, userId: string, groupId: string): Promise<RoomContext | null> {
  const { data: group } = await supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle();
  if (!group) return null;
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, joined_at, profiles(first_name)")
    .eq("group_id", groupId)
    .order("joined_at");
  if (!members?.some((m) => m.user_id === userId)) return null;
  const { data: agreement } = await supabase
    .from("agreements")
    .select("id, status")
    .eq("group_id", groupId)
    .maybeSingle();
  let overnightLimit: number | null = null;
  if (agreement && agreement.status !== "void") {
    const { data: section } = await supabase
      .from("agreement_sections")
      .select("content")
      .eq("agreement_id", agreement.id)
      .eq("key", "guests")
      .maybeSingle();
    overnightLimit = agreementOvernightLimit(section?.content);
  }
  return {
    groupId: group.id,
    name: group.name,
    members: members.map((m) => ({ id: m.user_id, firstName: (m.profiles as { first_name: string } | null)?.first_name ?? "Roommate" })),
    overnightLimit,
    agreementStatus: (agreement?.status as RoomContext["agreementStatus"]) ?? null,
  };
}

export interface RoomEventRow extends RoomEvent {
  createdBy: string;
  notes: string | null;
}

export async function loadRoomEvents(supabase: ServerSupabase, groupId: string): Promise<RoomEventRow[] | null> {
  const { data, error } = await supabase
    .from("room_events")
    .select("id, kind, title, starts_at, ends_at, overnight, guest_count, rrule, notes, created_by")
    .eq("group_id", groupId)
    .order("starts_at");
  if (error) return null;
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind as RoomEvent["kind"],
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    overnight: e.overnight,
    guestCount: e.guest_count,
    rrule: e.rrule,
    notes: e.notes,
    createdBy: e.created_by,
  }));
}
