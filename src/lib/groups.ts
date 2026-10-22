import type { ServerSupabase } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";

export interface GroupMember {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
  classYear: string | null;
  major: string | null;
  role: "owner" | "member";
}

export interface GroupCandidate {
  id: string;
  firstName: string;
  lastInitial: string;
  classYear: string | null;
  major: string | null;
  avatarUrl: string | null;
  placeholder: string | null;
  groupScore: number;
  minScore: number;
  memberScores: { memberId: string; score: number }[];
  budgetMin: number;
  budgetMax: number;
  moveInDate: string | null;
  pendingKind: "invite" | "request" | null;
}

export interface GroupRequestRow {
  id: string;
  kind: "invite" | "request";
  message: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastInitial: string; avatarUrl: string | null };
  /** Requester's score with each member (join requests only). */
  scores: { memberId: string; score: number | null }[];
}

export interface GroupDetail {
  id: string;
  name: string;
  targetSize: number;
  status: "open" | "full";
  ownerId: string;
  conversationId: string | null;
  members: GroupMember[];
  pairs: { a: string; b: string; score: number }[];
  candidates: GroupCandidate[];
  joinRequests: GroupRequestRow[];
  sentInvites: GroupRequestRow[];
}

export async function myGroupId(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId).maybeSingle();
  return data?.group_id ?? null;
}

export async function loadGroup(supabase: ServerSupabase, userId: string, groupId: string): Promise<GroupDetail | null> {
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, target_size, status, owner_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: memberRows }, { data: conversation }, { data: pairs }, { data: candidates }, { data: requests }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("user_id, role, joined_at, profiles(first_name, last_initial, avatar_path, class_year, major)")
        .eq("group_id", groupId)
        .order("joined_at"),
      supabase.from("conversations").select("id").eq("group_id", groupId).maybeSingle(),
      supabase.rpc("group_pair_scores", { p_group_id: groupId }),
      group.status === "open"
        ? supabase.rpc("group_candidates", { p_group_id: groupId, p_limit: 24, p_offset: 0 })
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("group_requests")
        .select("id, kind, message, created_at, user_id")
        .eq("group_id", groupId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  const requestUserIds = (requests ?? []).map((r) => r.user_id);
  const [{ data: requestProfiles }, { data: myScores }] = await Promise.all([
    requestUserIds.length
      ? supabase.from("profiles").select("id, first_name, last_initial, avatar_path").in("id", requestUserIds)
      : Promise.resolve({ data: [] as never[] }),
    requestUserIds.length
      ? supabase.from("match_scores").select("candidate_id, score").eq("viewer_id", userId).in("candidate_id", requestUserIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const profileBy = new Map((requestProfiles ?? []).map((p) => [p.id, p]));
  const myScoreBy = new Map((myScores ?? []).map((s) => [s.candidate_id, s.score]));

  const toRequest = (r: { id: string; kind: string; message: string | null; created_at: string; user_id: string }): GroupRequestRow | null => {
    const p = profileBy.get(r.user_id);
    if (!p) return null;
    return {
      id: r.id,
      kind: r.kind as GroupRequestRow["kind"],
      message: r.message,
      createdAt: r.created_at,
      person: { id: p.id, firstName: p.first_name, lastInitial: p.last_initial, avatarUrl: photoUrl(p.avatar_path) },
      scores: [{ memberId: userId, score: myScoreBy.get(r.user_id) ?? null }],
    };
  };

  return {
    id: group.id,
    name: group.name,
    targetSize: group.target_size,
    status: group.status as GroupDetail["status"],
    ownerId: group.owner_id,
    conversationId: conversation?.id ?? null,
    members: (memberRows ?? []).map((m) => {
      const p = m.profiles as unknown as { first_name: string; last_initial: string; avatar_path: string | null; class_year: string | null; major: string | null };
      return {
        id: m.user_id,
        firstName: p.first_name,
        lastInitial: p.last_initial,
        avatarUrl: photoUrl(p.avatar_path),
        classYear: p.class_year,
        major: p.major,
        role: m.role as GroupMember["role"],
      };
    }),
    pairs: (pairs ?? []).map((p) => ({ a: p.a, b: p.b, score: p.score })),
    candidates: (candidates ?? []).map((c) => ({
      id: c.candidate_id,
      firstName: c.first_name,
      lastInitial: c.last_initial,
      classYear: c.class_year,
      major: c.major,
      avatarUrl: photoUrl(c.avatar_path),
      placeholder: c.avatar_placeholder,
      groupScore: c.group_score,
      minScore: c.min_score,
      memberScores: (c.member_scores as { member_id: string; score: number }[]).map((s) => ({ memberId: s.member_id, score: s.score })),
      budgetMin: c.budget_min,
      budgetMax: c.budget_max,
      moveInDate: c.move_in_date,
      pendingKind: (c.pending_kind as GroupCandidate["pendingKind"]) ?? null,
    })),
    joinRequests: (requests ?? []).filter((r) => r.kind === "request").map(toRequest).filter((r): r is GroupRequestRow => r !== null),
    sentInvites: (requests ?? []).filter((r) => r.kind === "invite").map(toRequest).filter((r): r is GroupRequestRow => r !== null),
  };
}

export async function loadMyJoinRequests(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase
    .from("group_requests")
    .select("id, created_at, group_id, groups(name, target_size)")
    .eq("user_id", userId)
    .eq("kind", "request")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const g = r.groups as unknown as { name: string; target_size: number } | null;
    return { id: r.id, groupId: r.group_id, groupName: g?.name ?? "A group", createdAt: r.created_at };
  });
}
