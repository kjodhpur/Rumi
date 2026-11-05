import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { loadCheckinHome } from "@/lib/checkins/load";
import { CheckInPanel } from "@/components/checkins/check-in-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("checkins");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const user = await getUser();
  const [home, t] = await Promise.all([loadCheckinHome(user!.id), getT("checkins")]);
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <CheckInPanel home={home} />
    </div>
  );
}
