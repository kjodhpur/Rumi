import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { buildMatchCard, findMatchShare } from "@/lib/share/load";
import { MatchShareView } from "@/components/share/match-share-view";

export const dynamic = "force-dynamic";

const NO_INDEX = { index: false, follow: false } as const;

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const record = await findMatchShare(params.token);
  const card = record?.ready ? await buildMatchCard(record) : null;
  if (!card) return { title: "Match on Rumi", robots: NO_INDEX };
  const title = `${card.firstNames[0]} & ${card.firstNames[1]} — a roommate match on Rumi`;
  const image = `/api/og/match/${params.token}`;
  return {
    title,
    description: `A ${card.score} out of 100 roommate match on Rumi.`,
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
    return <MatchShareView card={card} path={path} mode="public" />;
  }

  const user = await getUser();
  const waiting = user && record.consented[user.id] === false;
  if (!user || !waiting) notFound();
  const card = await buildMatchCard(record);
  if (!card) notFound();
  return (
    <MatchShareView
      card={card}
      path={path}
      mode="consent"
      partnerId={user.id === record.userA ? record.userB : record.userA}
    />
  );
}
