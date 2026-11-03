import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSafeMatchShareCard, hashShareToken, isTokenShaped, type SafeMatchShareCard } from "./token";

export interface MatchShareRecord {
  id: string;
  userA: string;
  userB: string;
  ready: boolean;
  consented: Record<string, boolean>;
}

/** The live share row for a token: not revoked, not expired. Null for anything else. */
export async function findMatchShare(token: string | undefined): Promise<MatchShareRecord | null> {
  if (!isTokenShaped(token)) return null;
  const { data } = await createAdminClient()
    .from("match_share_tokens")
    .select("id, user_a, user_b, user_a_consented, user_b_consented, revoked_at, expires_at")
    .eq("token_hash", hashShareToken(token))
    .maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return {
    id: data.id,
    userA: data.user_a,
    userB: data.user_b,
    ready: data.user_a_consented && data.user_b_consented,
    consented: { [data.user_a]: data.user_a_consented, [data.user_b]: data.user_b_consented },
  };
}

/** The PII-safe card for a share row, or null when the pair no longer has a score. */
export async function buildMatchCard(record: MatchShareRecord): Promise<SafeMatchShareCard | null> {
  const db = createAdminClient();
  const [{ data: people }, { data: score }] = await Promise.all([
    db.from("profiles").select("id, first_name, banned_at").in("id", [record.userA, record.userB]),
    db
      .from("match_scores")
      .select("score, reasons")
      .eq("viewer_id", record.userA)
      .eq("candidate_id", record.userB)
      .maybeSingle(),
  ]);
  if (!score || !people || people.length < 2 || people.some((p) => p.banned_at)) return null;
  const name = (id: string) => people.find((p) => p.id === id)?.first_name;
  return buildSafeMatchShareCard({
    nameA: name(record.userA),
    nameB: name(record.userB),
    score: score.score,
    reasons: score.reasons,
  });
}
