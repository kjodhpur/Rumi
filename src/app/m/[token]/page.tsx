import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { buildSafeMatchShareCard, hashShareToken } from "@/lib/share/token";
import { MatchShareView } from "@/components/share/match-share-view";

export const dynamic = "force-dynamic";

interface MatchSharePageProps {
  params: Promise<{ token: string }> | { token: string };
}

export async function generateMetadata({
  params,
}: MatchSharePageProps): Promise<Metadata> {
  const { token } = await Promise.resolve(params);
  if (!token) return { title: "Match on Rumi" };

  const supabase = createAdminClient();
  const tokenHash = hashShareToken(token);

  const { data: record } = await supabase
    .from("match_share_tokens")
    .select("id, user_a, user_b, user_a_consented, user_b_consented, revoked_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const now = new Date();
  if (
    !record ||
    record.revoked_at ||
    new Date(record.expires_at) <= now ||
    !record.user_a_consented ||
    !record.user_b_consented
  ) {
    return {
      title: "Match on Rumi",
      robots: { index: false, follow: false },
    };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name")
    .in("id", [record.user_a, record.user_b]);

  const nameA = profiles?.find((p) => p.id === record.user_a)?.first_name ?? "Student";
  const nameB = profiles?.find((p) => p.id === record.user_b)?.first_name ?? "Student";

  return {
    title: `${nameA} & ${nameB} — Roommate Match on Rumi`,
    description: `${nameA} and ${nameB} are compatible roommates on Rumi.`,
    openGraph: {
      title: `${nameA} & ${nameB} — Roommate Match`,
      description: "Verified Roommate Compatibility on Rumi",
      images: [
        {
          url: `/api/og/match/${token}`,
          width: 1200,
          height: 630,
          alt: `${nameA} & ${nameB} Match Card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${nameA} & ${nameB} — Roommate Match`,
      images: [`/api/og/match/${token}`],
    },
    robots: { index: false, follow: false },
  };
}

export default async function MatchSharePage({ params }: MatchSharePageProps) {
  const { token } = await Promise.resolve(params);
  if (!token) notFound();

  const supabase = createAdminClient();
  const tokenHash = hashShareToken(token);

  const { data: record, error } = await supabase
    .from("match_share_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !record) notFound();

  // Expired or revoked immediately 404s
  const now = new Date();
  if (record.revoked_at || new Date(record.expires_at) <= now) {
    notFound();
  }

  const isConsentedByBoth = record.user_a_consented && record.user_b_consented;

  // If not mutually consented, check if the visitor is the unconsented participant
  let canConsent = false;
  let partnerId: string | undefined;

  if (!isConsentedByBoth) {
    const user = await getUser();
    if (!user) notFound();

    if (user.id === record.user_a && !record.user_a_consented) {
      canConsent = true;
      partnerId = record.user_b;
    } else if (user.id === record.user_b && !record.user_b_consented) {
      canConsent = true;
      partnerId = record.user_a;
    } else {
      // Any other visitor gets 404 until both consent
      notFound();
    }
  }

  // Load profile data
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name")
    .in("id", [record.user_a, record.user_b]);

  const profileA = profiles?.find((p) => p.id === record.user_a);
  const profileB = profiles?.find((p) => p.id === record.user_b);

  // Load match score
  const { data: matchScore } = await supabase
    .from("match_scores")
    .select("score, reasons")
    .or(
      `and(viewer_id.eq.${record.user_a},candidate_id.eq.${record.user_b}),and(viewer_id.eq.${record.user_b},candidate_id.eq.${record.user_a})`,
    )
    .limit(1)
    .maybeSingle();

  const reasons = Array.isArray(matchScore?.reasons)
    ? (matchScore?.reasons as string[])
    : [];

  const card = buildSafeMatchShareCard({
    nameA: profileA?.first_name,
    nameB: profileB?.first_name,
    score: matchScore?.score ?? 90,
    reasons,
  });

  return (
    <MatchShareView
      card={card}
      token={token}
      isConsentedByBoth={isConsentedByBoth}
      canConsent={canConsent}
      partnerId={partnerId}
    />
  );
}
