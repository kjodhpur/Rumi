import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

/**
 * Track change (3.2): answers to questions only the old track was asked are cleared;
 * everything else stays. Runs as the student (RLS: own answers only).
 */
export async function clearTrackAnswers(
  supabase: ServerSupabase,
  userId: string,
  schoolId: string,
  oldTrack: string | null,
  newTrack: string | null,
) {
  if (!oldTrack || oldTrack === newTrack) return 0;
  const { data: tracks } = await supabase
    .from("tracks")
    .select("key, question_keys")
    .eq("school_id", schoolId);
  const keep = new Set(tracks?.find((t) => t.key === newTrack)?.question_keys ?? []);
  const drop = (tracks?.find((t) => t.key === oldTrack)?.question_keys ?? []).filter(
    (k) => !keep.has(k),
  );
  if (!drop.length) return 0;
  const { count } = await supabase
    .from("school_question_answers")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .in("question_key", drop);
  return count ?? 0;
}
