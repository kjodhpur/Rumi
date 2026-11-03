import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { conversationStarters, type StarterGroup, type StarterPrefs } from "@/lib/matching/starters";
import { FACTORS, FACTOR_LABELS, type FactorKey } from "@/lib/options";

export interface ChatStarter extends StarterGroup {
  label: string;
}

/** Openers for the watch-outs between the viewer and one other student, read with the viewer's session. */
export async function loadStarters(supabase: ServerSupabase, viewerId: string, otherId: string): Promise<ChatStarter[]> {
  const [{ data: score }, { data: mine }, { data: theirs }] = await Promise.all([
    supabase.from("match_scores").select("watchouts").eq("viewer_id", viewerId).eq("candidate_id", otherId).maybeSingle(),
    supabase
      .from("preferences")
      .select("sleep_schedule, cleanliness, noise, guests, smoking, drinking, pets, housing_type")
      .eq("user_id", viewerId)
      .maybeSingle(),
    supabase.rpc("get_public_preferences", { p_user: otherId }),
  ]);
  const them = Array.isArray(theirs) ? theirs[0] : null;
  if (!score || !mine || !them) return [];
  const keys = (Array.isArray(score.watchouts) ? (score.watchouts as { key?: string }[]) : [])
    .map((w) => w.key)
    .filter((k): k is FactorKey => typeof k === "string" && (FACTORS as readonly string[]).includes(k));
  const toPrefs = (p: typeof mine): StarterPrefs => ({
    sleepSchedule: p.sleep_schedule,
    cleanliness: p.cleanliness,
    noise: p.noise,
    guests: p.guests,
    smoking: p.smoking,
    drinking: p.drinking,
    pets: p.pets,
    housingType: p.housing_type,
  });
  return conversationStarters(keys, toPrefs(mine), toPrefs(them)).map((g) => ({ ...g, label: FACTOR_LABELS[g.key] }));
}
