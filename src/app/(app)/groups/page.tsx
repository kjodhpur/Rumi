import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadMyJoinRequests, myGroupId } from "@/lib/groups";
import { photoUrl } from "@/lib/photos";
import { GroupsHub } from "@/components/groups/groups-hub";
import type { GroupSuggestion } from "@/components/groups/groups-strip";

export const metadata: Metadata = { title: "Groups" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await getUser();
  const supabase = createClient();
  const groupId = await myGroupId(supabase, user!.id);
  if (groupId) redirect(`/groups/${groupId}`);

  const [{ data: suggestions }, myRequests] = await Promise.all([
    supabase.rpc("groups_for_me", { p_limit: 12 }),
    loadMyJoinRequests(supabase, user!.id),
  ]);

  const groups: GroupSuggestion[] = (suggestions ?? []).map((g) => ({
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

  return <GroupsHub suggestions={groups} myRequests={myRequests} />;
}
