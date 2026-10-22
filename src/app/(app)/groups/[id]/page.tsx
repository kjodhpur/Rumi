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
  const group = await loadGroup(createClient(), user!.id, params.id);
  if (!group) redirect("/groups");
  return (
    <SwipeBack fallbackHref="/matches">
      <GroupDetailView userId={user!.id} group={group} />
    </SwipeBack>
  );
}
