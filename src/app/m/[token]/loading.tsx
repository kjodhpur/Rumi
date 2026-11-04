import { CardPageSkeleton } from "@/components/layout/page-skeletons";
import { getT } from "@/lib/i18n/server";

export default async function MatchCardLoading() {
  const t = await getT("common");
  return <CardPageSkeleton label={t("loadingPage.match")} />;
}
