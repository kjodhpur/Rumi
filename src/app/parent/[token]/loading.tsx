import { CardPageSkeleton } from "@/components/layout/page-skeletons";
import { getT } from "@/lib/i18n/server";

export default async function FamilyViewLoading() {
  const t = await getT("common");
  return <CardPageSkeleton label={t("loadingPage.family")} />;
}
