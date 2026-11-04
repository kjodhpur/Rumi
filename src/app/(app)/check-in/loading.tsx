import { TabbedPageSkeleton } from "@/components/layout/page-skeletons";
import { getT } from "@/lib/i18n/server";

export default async function CheckInLoading() {
  const t = await getT("common");
  return <TabbedPageSkeleton label={t("loadingPage.checkIns")} />;
}
