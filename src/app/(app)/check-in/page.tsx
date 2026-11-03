import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { loadCheckinHome } from "@/lib/checkins/load";
import { CheckInPanel } from "@/components/checkins/check-in-panel";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Check-in" };
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const user = await getUser();
  const home = await loadCheckinHome(user!.id);
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <PageHeader title="Check-in" description="A short pulse after you move in, so a rough week doesn't sit until it's a crisis." />
      <CheckInPanel home={home} />
    </div>
  );
}
