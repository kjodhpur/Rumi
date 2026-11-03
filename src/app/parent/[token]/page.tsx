import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken } from "@/lib/share/token";
import { buildParentViewData, type FamilyShareScope } from "@/lib/family/scope";
import { ParentView } from "@/components/family/parent-view";

export const dynamic = "force-dynamic";

interface ParentPageProps {
  params: Promise<{ token: string }> | { token: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Student Roommate Overview — Rumi Family View",
    robots: { index: false, follow: false },
  };
}

export default async function ParentSharePage({ params }: ParentPageProps) {
  const resolved = await Promise.resolve(params);
  const token = resolved?.token;
  if (!token) notFound();

  const supabase = createAdminClient();
  const tokenHash = hashShareToken(token);

  const { data: share, error: shareError } = await supabase
    .from("family_shares")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (shareError || !share) notFound();

  // Expiry & revocation check
  const now = new Date();
  if (share.revoked_at || new Date(share.expires_at) <= now) {
    notFound();
  }

  // Load student profile
  const { data: student } = await supabase
    .from("profiles")
    .select("id, first_name, avatar_path")
    .eq("id", share.user_id)
    .single();

  if (!student) notFound();

  // Check for confirmed room group
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", student.id)
    .limit(1);

  let roommate: { id: string; firstName: string; avatarUrl: string | null } | null = null;
  let roommateConsented = false;
  let agreementStatus: string | null = null;
  let score = 90;
  let reasons: string[] = [];

  if (memberRows && memberRows.length > 0) {
    const groupId = memberRows[0].group_id;

    // Load group members
    const { data: groupMems } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", student.id)
      .limit(1);

    if (groupMems && groupMems.length > 0) {
      const roommateId = groupMems[0].user_id;
      const { data: rmProfile } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_path")
        .eq("id", roommateId)
        .single();

      if (rmProfile) {
        roommate = {
          id: rmProfile.id,
          firstName: rmProfile.first_name || "Roommate",
          avatarUrl: rmProfile.avatar_path,
        };

        // Check if roommate has consented to sharing on match_share_tokens
        const { data: shareConsent } = await supabase
          .from("match_share_tokens")
          .select("user_a, user_b, user_a_consented, user_b_consented")
          .or(
            `and(user_a.eq.${student.id},user_b.eq.${roommateId}),and(user_a.eq.${roommateId},user_b.eq.${student.id})`,
          )
          .is("revoked_at", null)
          .limit(1)
          .maybeSingle();

        if (shareConsent) {
          const isUserA = shareConsent.user_a === roommateId;
          roommateConsented = isUserA
            ? shareConsent.user_a_consented
            : shareConsent.user_b_consented;
        }

        // Load match score
        const { data: matchScore } = await supabase
          .from("match_scores")
          .select("score, reasons")
          .or(
            `and(viewer_id.eq.${student.id},candidate_id.eq.${roommateId}),and(viewer_id.eq.${roommateId},candidate_id.eq.${student.id})`,
          )
          .limit(1)
          .maybeSingle();

        if (matchScore) {
          score = matchScore.score;
          reasons = Array.isArray(matchScore.reasons)
            ? (matchScore.reasons as string[])
            : [];
        }

        // Load agreement status
        const { data: agreement } = await supabase
          .from("agreements")
          .select("status")
          .eq("group_id", groupId)
          .maybeSingle();

        if (agreement) {
          agreementStatus = agreement.status;
        }
      }
    }
  }

  const summary = buildParentViewData({
    student: {
      id: student.id,
      firstName: student.first_name || "Student",
      avatarUrl: student.avatar_path,
    },
    roommate,
    roommateConsented,
    score,
    reasons,
    agreementStatus,
    scope: (share.scope as FamilyShareScope) || {},
  });

  return <ParentView summary={summary} />;
}
