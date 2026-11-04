import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { buildMatchCard, findMatchShare } from "@/lib/share/load";
import { MatchShareView } from "@/components/share/match-share-view";
import { WithI18n } from "@/components/providers/with-i18n";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const NO_INDEX = { index: false, follow: false } as const;

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const record = await findMatchShare(params.token);
  const card = record?.ready ? await buildMatchCard(record) : null;
  const t = await getT("share");
  if (!card) return { title: t("metaTitle"), robots: NO_INDEX };
  const title = t("metaCard", { a: card.firstNames[0], b: card.firstNames[1] });
  const image = `/api/og/match/${params.token}`;
  return {
    title,
    description: t("metaDescription", { score: card.score }),
    robots: NO_INDEX,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

/** Revoked, expired or not-yet-consented links 404 for everyone but the waiting participant. */
export default async function MatchSharePage({ params }: { params: { token: string } }) {
  const record = await findMatchShare(params.token);
  if (!record) notFound();

  const path = `/m/${params.token}`;
  if (record.ready) {
    const card = await buildMatchCard(record);
    if (!card) notFound();
    return (
      <WithI18n>
        <MatchShareView card={card} path={path} mode="public" />
      </WithI18n>
    );
  }

  const user = await getUser();
  const waiting = user && record.consented[user.id] === false;
  if (!user || !waiting) notFound();
  const card = await buildMatchCard(record);
  if (!card) notFound();
  return (
    <WithI18n>
      <MatchShareView
        card={card}
        path={path}
        mode="consent"
        partnerId={user.id === record.userA ? record.userB : record.userA}
      />
    </WithI18n>
  );
}
