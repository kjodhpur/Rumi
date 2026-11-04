import "server-only";
import { createClient } from "@/lib/supabase/server";
import { membersMatch, readyToSign, sectionAccepted } from "./rules";

export interface AgreementMember {
  id: string;
  firstName: string;
  lastInitial: string;
}

export interface AgreementSection {
  key: string;
  title: string;
  content: string;
  proposedBy: string | null;
  acceptedBy: string[];
  accepted: boolean;
  updatedAt: string;
  /** The text before the latest edit, when someone changed the prefilled draft. */
  previous: string | null;
  comments: { id: string; authorId: string | null; body: string; createdAt: string }[];
}

export interface AgreementView {
  groupId: string;
  groupName: string;
  members: AgreementMember[];
  agreement: {
    id: string;
    version: number;
    status: "draft" | "signed" | "reopened" | "void";
    signedAt: string | null;
    stale: boolean;
    sections: AgreementSection[];
    signatures: { userId: string; typedName: string; signedAt: string }[];
    ready: boolean;
  } | null;
}

/** Everything the agreement screen needs, read with the member's own session (RLS checks membership). */
export async function loadAgreement(groupId: string): Promise<AgreementView | null> {
  const supabase = createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, group_members(user_id, joined_at, profiles(first_name, last_initial))")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;
  const members = group.group_members
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map((m) => {
      const p = m.profiles as { first_name: string; last_initial: string } | null;
      return {
        id: m.user_id,
        firstName: p?.first_name ?? "Member",
        lastInitial: p?.last_initial ?? "",
      };
    });

  const { data: agreement } = await supabase
    .from("agreements")
    .select("id, version, status, member_ids, signed_at")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!agreement) return { groupId, groupName: group.name, members, agreement: null };

  const [{ data: sections }, { data: signatures }, { data: edits }, { data: comments }] =
    await Promise.all([
      supabase
        .from("agreement_sections")
        .select("key, title, position, content, proposed_by, accepted_by, updated_at")
        .eq("agreement_id", agreement.id)
        .order("position"),
      supabase
        .from("agreement_signatures")
        .select("user_id, typed_name, signed_at, version")
        .eq("agreement_id", agreement.id),
      supabase
        .from("agreement_events")
        .select("section_key, before, created_at")
        .eq("agreement_id", agreement.id)
        .eq("kind", "edited")
        .order("created_at", { ascending: false }),
      supabase
        .from("agreement_comments")
        .select("id, section_key, author_id, body, created_at")
        .eq("agreement_id", agreement.id)
        .order("created_at"),
    ]);
  const previousOf = new Map<string, string>();
  for (const e of edits ?? [])
    if (e.section_key && e.before !== null && !previousOf.has(e.section_key))
      previousOf.set(e.section_key, e.before);

  const memberIds = members.map((m) => m.id);
  const stale = !membersMatch(agreement.member_ids, memberIds);
  const mapped = (sections ?? []).map((s) => ({
    key: s.key,
    title: s.title,
    content: s.content,
    proposedBy: s.proposed_by,
    acceptedBy: s.accepted_by,
    accepted: sectionAccepted({ key: s.key, acceptedBy: s.accepted_by }, memberIds),
    updatedAt: s.updated_at,
    previous: previousOf.get(s.key) ?? null,
    comments: (comments ?? [])
      .filter((c) => c.section_key === s.key)
      .map((c) => ({ id: c.id, authorId: c.author_id, body: c.body, createdAt: c.created_at })),
  }));

  return {
    groupId,
    groupName: group.name,
    members,
    agreement: {
      id: agreement.id,
      version: agreement.version,
      status: stale ? "void" : (agreement.status as "draft" | "signed" | "reopened" | "void"),
      signedAt: agreement.signed_at,
      stale,
      sections: mapped,
      signatures: (signatures ?? [])
        .filter((s) => s.version === agreement.version)
        .map((s) => ({ userId: s.user_id, typedName: s.typed_name, signedAt: s.signed_at })),
      ready: readyToSign(mapped, memberIds),
    },
  };
}
