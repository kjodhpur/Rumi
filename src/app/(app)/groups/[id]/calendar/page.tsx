import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadRoomContext, loadRoomEvents } from "@/lib/groups/room";
import { RoomCalendarView } from "@/components/groups/calendar/room-calendar-view";
import { ErrorState } from "@/components/ui/error-state";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("roomCalendar");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function RoomCalendarPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = await getUser();
  if (!user) redirect(`/login?next=/groups/${params.id}/calendar`);

  const supabase = createClient();
  const room = await loadRoomContext(supabase, user.id, params.id);
  if (!room) notFound();
  const events = await loadRoomEvents(supabase, params.id);
  if (!events) {
    const [t, tc] = await Promise.all([getT("roomCalendar"), getT("common")]);
    return <ErrorState title={t("loadError")} description={tc("refresh")} />;
  }

  return (
    <RoomCalendarView
      groupId={room.groupId}
      groupName={room.name}
      userId={user.id}
      events={events}
      overnightLimit={room.overnightLimit}
      memberNames={Object.fromEntries(room.members.map((m) => [m.id, m.firstName]))}
    />
  );
}
