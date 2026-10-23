"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { syncTaste } from "@/lib/spotify";
import { recomputeMatchesFor } from "@/lib/matching/recompute";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";

export async function resyncSpotify(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!(await rateLimit(`spotify-sync:${user.id}`, { max: 5, window: 3600 }))) return fail("Try again in a little while.");
  try {
    const synced = await syncTaste(user.id);
    if (!synced) return fail("Reconnect Spotify to refresh your music.");
    await recomputeMatchesFor(user.id);
    revalidatePath("/settings/accounts");
    return ok();
  } catch {
    return fail("Spotify didn't respond. Try again later.");
  }
}
