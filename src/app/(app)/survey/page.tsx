import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { loadSurveyContext } from "@/lib/retention/survey";
import { PageHeader } from "@/components/layout/page-header";
import { RoomAgainSurvey } from "@/components/retention/room-again-survey";

export const metadata: Metadata = { title: "End of term" };
export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/survey");
  const context = await loadSurveyContext(user.id);
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <PageHeader title="End of term" description="How the year went, and whether to keep your group for next year." />
      <RoomAgainSurvey context={context} userId={user.id} />
    </div>
  );
}
