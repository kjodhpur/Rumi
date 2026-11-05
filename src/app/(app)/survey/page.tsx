import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { loadSurveyContext } from "@/lib/retention/survey";
import { PageHeader } from "@/components/layout/page-header";
import { RoomAgainSurvey } from "@/components/retention/room-again-survey";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("retention");
  return { title: t("survey.title") };
}
export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/survey");
  const [context, t] = await Promise.all([loadSurveyContext(user.id), getT("retention")]);
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <PageHeader title={t("survey.title")} description={t("survey.description")} />
      <RoomAgainSurvey context={context} userId={user.id} />
    </div>
  );
}
