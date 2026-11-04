import { TabbedPageSkeleton } from "@/components/layout/page-skeletons";
import { getT } from "@/lib/i18n/server";

export default async function RoomHomeLoading() {
  const t = await getT("common");
  return <TabbedPageSkeleton label={t("loadingPage.room")} />;
}
