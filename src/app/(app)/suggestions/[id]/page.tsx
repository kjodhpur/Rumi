import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadProfileDetail } from "@/lib/profile";
import { HousingSuggestion } from "@/components/profile/housing-suggestion";

export const metadata: Metadata = { title: "Roommate suggestion" };
export const dynamic = "force-dynamic";

export default async function SuggestionPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = (await getUser())!;
  const supabase = createClient();
  // RLS: only the two students can read a proposal, and only once housing sent it.
  const { data: proposal } = await supabase
    .from("auto_pair_proposals")
    .select("id, school_id, member_ids, score, status, responses, group_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!proposal) notFound();
  const otherId = proposal.member_ids.find((id) => id !== user.id)!;
  const [detail, { data: school }] = await Promise.all([
    loadProfileDetail(supabase, user.id, otherId),
    supabase.from("schools").select("housing_office_name").eq("id", proposal.school_id).maybeSingle(),
  ]);
  const responses = (proposal.responses ?? {}) as Record<string, boolean>;

  return (
    <HousingSuggestion
      id={proposal.id}
      office={school?.housing_office_name ?? "Your housing office"}
      status={proposal.status}
      myAnswer={responses[user.id] ?? null}
      groupId={proposal.group_id}
      score={detail?.match?.score ?? proposal.score}
      other={
        detail
          ? {
              id: detail.id,
              firstName: detail.firstName,
              lastInitial: detail.lastInitial,
              classYear: detail.classYear,
              major: detail.major,
              photoUrl: detail.photos[0]?.url ?? null,
              reasons: detail.match?.reasons ?? [],
              watchouts: detail.match?.watchouts ?? [],
            }
          : null
      }
    />
  );
}
