"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { disconnectSpotify, syncUserSpotify } from "@/lib/spotify";
import { recomputeMatchCache } from "@/lib/matches-service";

export async function disconnectSpotifyAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await disconnectSpotify(user.id);
  try {
    await recomputeMatchCache(user.id);
  } catch {
    /* ignore */
  }
  revalidatePath("/me");
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function refreshSpotifyAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await syncUserSpotify(user.id);
  try {
    await recomputeMatchCache(user.id);
  } catch {
    /* ignore */
  }
  revalidatePath("/me");
  return { ok: true };
}
