import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";
import { GroupsStrip, type GroupSuggestion } from "./groups-strip";

/** "Groups looking for someone like you" — open groups where every member is a mutual match. */
export async function GroupsForYou() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("groups_for_me", { p_limit: 8 });
  if (error || !data?.length) return null;

  const groups: GroupSuggestion[] = data.map((g) => ({
    id: g.group_id,
    name: g.name,
    targetSize: g.target_size,
    memberCount: g.member_count,
    score: g.group_score,
    minScore: g.min_score,
    pending: g.pending,
    members: (g.members as { id: string; first_name: string; last_initial: string; avatar_path: string | null; score: number }[]).map((m) => ({
      id: m.id,
      firstName: m.first_name,
      lastInitial: m.last_initial,
      avatarUrl: photoUrl(m.avatar_path),
      score: m.score,
    })),
  }));
  return <GroupsStrip groups={groups} />;
}
