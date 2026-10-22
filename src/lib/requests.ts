import type { ServerSupabase } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";

export interface IntroRequest {
  id: string;
  direction: "received" | "sent";
  message: string;
  createdAt: string;
  person: {
    id: string;
    firstName: string;
    lastInitial: string;
    avatarUrl: string | null;
    placeholder: string | null;
    classYear: string | null;
    major: string | null;
  };
  score: number | null;
  reasons: string[];
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  targetSize: number;
  message: string | null;
  inviterName: string;
  createdAt: string;
  members: { id: string; firstName: string; lastInitial: string; avatarUrl: string | null; score: number | null }[];
}

export async function loadRequests(supabase: ServerSupabase, userId: string) {
  const [{ data: intros }, { data: invites }] = await Promise.all([
    supabase
      .from("intros")
      .select("id, sender_id, recipient_id, message, created_at")
      .eq("status", "pending")
      .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_requests")
      .select("id, group_id, created_by, message, created_at, groups(name, target_size)")
      .eq("user_id", userId)
      .eq("kind", "invite")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const otherIds = (intros ?? []).map((i) => (i.sender_id === userId ? i.recipient_id : i.sender_id));
  const groupIds = (invites ?? []).map((i) => i.group_id);

  const [{ data: profiles }, { data: scores }, { data: groupMembers }, { data: photos }] = await Promise.all([
    otherIds.length
      ? supabase.from("profiles").select("id, first_name, last_initial, avatar_path, class_year, major").in("id", otherIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("match_scores").select("candidate_id, score, reasons").eq("viewer_id", userId),
    groupIds.length
      ? supabase.from("group_members").select("group_id, user_id, profiles(first_name, last_initial, avatar_path)").in("group_id", groupIds)
      : Promise.resolve({ data: [] as never[] }),
    otherIds.length
      ? supabase.from("photos").select("user_id, placeholder").in("user_id", otherIds).eq("position", 0)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const profileBy = new Map((profiles ?? []).map((p) => [p.id, p]));
  const scoreBy = new Map((scores ?? []).map((s) => [s.candidate_id, s]));
  const placeholderBy = new Map((photos ?? []).map((p) => [p.user_id, p.placeholder]));
  const { data: inviters } = invites?.length
    ? await supabase.from("profiles").select("id, first_name").in("id", invites.map((i) => i.created_by))
    : { data: [] as { id: string; first_name: string }[] };
  const inviterBy = new Map((inviters ?? []).map((p) => [p.id, p.first_name]));

  const introRequests: IntroRequest[] = [];
  for (const intro of intros ?? []) {
    const otherId = intro.sender_id === userId ? intro.recipient_id : intro.sender_id;
    const p = profileBy.get(otherId);
    if (!p) continue; // no longer visible (hidden, banned or blocked)
    const s = scoreBy.get(otherId);
    introRequests.push({
      id: intro.id,
      direction: intro.recipient_id === userId ? "received" : "sent",
      message: intro.message,
      createdAt: intro.created_at,
      person: {
        id: p.id,
        firstName: p.first_name,
        lastInitial: p.last_initial,
        avatarUrl: photoUrl(p.avatar_path),
        placeholder: placeholderBy.get(p.id) ?? null,
        classYear: p.class_year,
        major: p.major,
      },
      score: s?.score ?? null,
      reasons: Array.isArray(s?.reasons) ? (s!.reasons as { label: string }[]).map((r) => r.label) : [],
    });
  }

  const groupInvites: GroupInvite[] = (invites ?? []).map((invite) => {
    const group = invite.groups as unknown as { name: string; target_size: number } | null;
    return {
      id: invite.id,
      groupId: invite.group_id,
      groupName: group?.name ?? "A group",
      targetSize: group?.target_size ?? 4,
      message: invite.message,
      inviterName: inviterBy.get(invite.created_by) ?? "Someone",
      createdAt: invite.created_at,
      members: (groupMembers ?? [])
        .filter((m) => m.group_id === invite.group_id)
        .map((m) => {
          const p = m.profiles as unknown as { first_name: string; last_initial: string; avatar_path: string | null } | null;
          return {
            id: m.user_id,
            firstName: p?.first_name ?? "Member",
            lastInitial: p?.last_initial ?? "",
            avatarUrl: photoUrl(p?.avatar_path),
            score: scoreBy.get(m.user_id)?.score ?? null,
          };
        }),
    };
  });

  return {
    received: introRequests.filter((r) => r.direction === "received"),
    sent: introRequests.filter((r) => r.direction === "sent"),
    groupInvites,
  };
}
