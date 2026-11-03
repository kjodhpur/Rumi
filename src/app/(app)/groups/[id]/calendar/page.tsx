import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadGroup } from "@/lib/groups";
import { RoomCalendarView, type RoomEventRecord } from "@/components/groups/calendar/room-calendar-view";

export const metadata: Metadata = { title: "Room Calendar" };
export const dynamic = "force-dynamic";

interface CalendarPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function RoomCalendarPage({ params }: CalendarPageProps) {
  const { id: groupId } = await Promise.resolve(params);
  if (!z.string().uuid().safeParse(groupId).success) redirect("/groups");

  const user = await getUser();
  if (!user) redirect(`/login?next=/groups/${groupId}/calendar`);

  const supabase = createClient();
  const group = await loadGroup(supabase, user.id, groupId);
  if (!group) redirect("/groups");

  // Load events
  const { data: eventsData } = await supabase
    .from("room_events")
    .select("*")
    .eq("group_id", groupId)
    .order("starts_at", { ascending: true });

  const events: RoomEventRecord[] = (eventsData || []).map((e) => ({
    id: e.id,
    group_id: e.group_id,
    created_by: e.created_by,
    kind: e.kind as RoomEventRecord["kind"],
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    overnight: e.overnight,
    guest_count: e.guest_count,
    notes: e.notes,
    created_at: e.created_at,
  }));

  const memberNames: Record<string, string> = {};
  for (const m of group.members) {
    memberNames[m.id] = m.firstName;
  }

  return (
    <RoomCalendarView
      groupId={groupId}
      userId={user.id}
      events={events}
      memberNames={memberNames}
    />
  );
}
