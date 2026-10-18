import { createClient } from "@/lib/supabase/server";

export async function trackEvent(
  eventName: string,
  userId?: string | null,
  meta: Record<string, unknown> = {},
) {
  try {
    const supabase = createClient();
    await supabase.from("events").insert({
      event_name: eventName,
      user_id: userId ?? null,
      meta,
    });
  } catch {
    // Analytics should never break the app
  }
}
