import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEADLINE_KEYS, DEADLINE_NAME } from "@/lib/notifications/deadline-nudges";
import type { AllDayEvent } from "./ics";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A student's housing dates: the active term's start and deadlines set by their housing
 * office, and the move-in date they planned. Today and later only.
 */
export async function housingDatesFor(userId: string, today: string): Promise<AllDayEvent[]> {
  const db = createAdminClient();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    db.from("profiles").select("school_id, schools(name)").eq("id", userId).maybeSingle(),
    db.from("preferences").select("move_in_date").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return [];
  const { data: term } = await db
    .from("terms")
    .select("id, name, starts_on, deadlines")
    .eq("school_id", profile.school_id)
    .eq("active", true)
    .maybeSingle();

  const school = (profile.schools as { name: string } | null)?.name ?? "Housing";
  const events: AllDayEvent[] = [];
  if (term) {
    const deadlines = (term.deadlines ?? {}) as Record<string, unknown>;
    for (const key of DEADLINE_KEYS) {
      const date = deadlines[key];
      if (typeof date === "string" && ISO_DATE.test(date))
        events.push({
          uid: `${term.id}-${key}`,
          title: DEADLINE_NAME[key],
          date,
          description: `${term.name} · ${school}`,
        });
    }
    events.push({
      uid: `${term.id}-starts`,
      title: `${term.name} starts`,
      date: term.starts_on,
      description: school,
    });
  }
  if (prefs?.move_in_date)
    events.push({
      uid: `${userId}-move-in`,
      title: "My planned move-in",
      date: prefs.move_in_date,
      description: "From your Rumi profile",
    });
  return events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}
