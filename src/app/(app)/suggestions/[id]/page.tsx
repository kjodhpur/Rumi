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
  // RLS: only the students in a proposal can read it, and only once housing sent it.
  const { data: proposal } = await supabase
    .from("auto_pair_proposals")
    .select("id, school_id, member_ids, score, status, responses, group_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!proposal) notFound();
  const otherIds = proposal.member_ids.filter((id) => id !== user.id);
  const [details, { data: school }] = await Promise.all([
    Promise.all(otherIds.map((id) => loadProfileDetail(supabase, user.id, id))),
    supabase
      .from("schools")
      .select("housing_office_name")
      .eq("id", proposal.school_id)
      .maybeSingle(),
  ]);
  const responses = (proposal.responses ?? {}) as Record<string, boolean>;

  return (
    <HousingSuggestion
      id={proposal.id}
      office={school?.housing_office_name ?? "Your housing office"}
      status={proposal.status}
      myAnswer={responses[user.id] ?? null}
      groupId={proposal.group_id}
      others={details
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .map((d) => ({
          id: d.id,
          firstName: d.firstName,
          lastInitial: d.lastInitial,
          classYear: d.classYear,
          major: d.major,
          photoUrl: d.photos[0]?.url ?? null,
          score: d.match?.score ?? (otherIds.length === 1 ? proposal.score : null),
          reasons: d.match?.reasons ?? [],
          watchouts: d.match?.watchouts ?? [],
        }))}
    />
  );
}
