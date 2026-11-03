import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { loadAgreement } from "@/lib/agreements/load";
import { AgreementEditor } from "@/components/groups/agreement-editor";
import { SwipeBack } from "@/components/motion/swipe-back";

export const metadata: Metadata = { title: "Roommate agreement" };
export const dynamic = "force-dynamic";

export default async function AgreementPage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) redirect("/groups");
  const user = await getUser();
  const view = await loadAgreement(params.id);
  if (!view) redirect("/groups");
  return (
    <SwipeBack fallbackHref={`/groups/${params.id}`}>
      <AgreementEditor userId={user!.id} view={view} />
    </SwipeBack>
  );
}
