import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken, isTokenShaped } from "@/lib/share/token";
import { buildParentSummary, parseScope } from "@/lib/family/scope";
import { photoUrl } from "@/lib/photos";
import { ParentView } from "@/components/family/parent-view";

export const metadata: Metadata = { title: "Your student on Rumi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Read-only family view. Everything is read with the service role after the token's hash,
 * expiry and revocation check; a revoked link 404s on the next request.
 */
export default async function ParentSharePage({ params }: { params: { token: string } }) {
  if (!isTokenShaped(params.token)) notFound();
  const db = createAdminClient();
  const { data: share } = await db
    .from("family_shares")
    .select("user_id, scope, expires_at, revoked_at")
    .eq("token_hash", hashShareToken(params.token))
    .maybeSingle();
  if (!share || share.revoked_at || Date.parse(share.expires_at) <= Date.now()) notFound();

  const { data: student } = await db.from("profiles").select("id, first_name, avatar_path, banned_at").eq("id", share.user_id).maybeSingle();
  if (!student || student.banned_at) notFound();

  const { data: membership } = await db.from("group_members").select("group_id, groups(name)").eq("user_id", student.id).maybeSingle();
  let roommates: Parameters<typeof buildParentSummary>[0]["roommates"] = [];
  let agreementStatus: string | null = null;
  if (membership) {
    const { data: others } = await db
      .from("group_members")
      .select("user_id, profiles(first_name, avatar_path)")
      .eq("group_id", membership.group_id)
      .neq("user_id", student.id);
    const ids = (others ?? []).map((o) => o.user_id);
    const [{ data: consents }, { data: scores }, { data: agreement }] = await Promise.all([
      ids.length ? db.from("consents").select("user_id").eq("kind", "family_view").is("revoked_at", null).in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string }[] }),
      ids.length ? db.from("match_scores").select("candidate_id, score, reasons").eq("viewer_id", student.id).in("candidate_id", ids) : Promise.resolve({ data: [] as { candidate_id: string; score: number; reasons: unknown }[] }),
      db.from("agreements").select("status").eq("group_id", membership.group_id).maybeSingle(),
    ]);
    const consented = new Set((consents ?? []).map((c) => c.user_id));
    roommates = (others ?? []).map((o) => {
      const profile = o.profiles as { first_name: string; avatar_path: string | null } | null;
      const score = (scores ?? []).find((s) => s.candidate_id === o.user_id);
      return {
        firstName: profile?.first_name ?? null,
        avatarUrl: photoUrl(profile?.avatar_path ?? null),
        consented: consented.has(o.user_id),
        score: score?.score ?? null,
        reasons: score?.reasons ?? [],
      };
    });
    agreementStatus = agreement?.status ?? null;
  }

  const summary = buildParentSummary({
    studentFirstName: student.first_name,
    studentAvatarUrl: photoUrl(student.avatar_path),
    groupName: (membership?.groups as { name: string } | null)?.name ?? null,
    roommates,
    agreementStatus,
    scope: parseScope(share.scope),
    expiresAt: share.expires_at,
  });
  return <ParentView summary={summary} />;
}
