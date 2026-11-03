import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadGroup } from "@/lib/groups";
import { GroupDetailView } from "@/components/groups/group-detail";
import { SwipeBack } from "@/components/motion/swipe-back";

export const metadata: Metadata = { title: "Group" };
export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) redirect("/groups");
  const user = await getUser();
  const supabase = createClient();
  const [group, { data: agreement }] = await Promise.all([
    loadGroup(supabase, user!.id, params.id),
    supabase.from("agreements").select("status, member_ids").eq("group_id", params.id).maybeSingle(),
  ]);
  if (!group) redirect("/groups");
  const current = agreement && [...agreement.member_ids].sort().join(",") === group.members.map((m) => m.id).sort().join(",");
  return (
    <SwipeBack fallbackHref="/matches">
      <GroupDetailView userId={user!.id} group={group} agreementStatus={current ? (agreement.status as "draft" | "signed" | "reopened") : null} />
    </SwipeBack>
  );
}
