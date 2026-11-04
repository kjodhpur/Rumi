import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/staff/audit";
import { visibleSignedAgreements } from "@/lib/staff/agreements";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Signed agreement" };
export const dynamic = "force-dynamic";

/** A signed agreement, read-only, only when every member shares with housing (and in an RA's buildings). */
export default async function StaffAgreementPage({ params }: { params: { groupId: string } }) {
  if (!z.string().uuid().safeParse(params.groupId).success) notFound();
  const context = await requireStaffPage("raWorkspace");
  const allowed = (await visibleSignedAgreements(context)).find(
    (a) => a.groupId === params.groupId,
  );
  if (!allowed) notFound();
  const db = createAdminClient();
  const { data: agreement } = await db
    .from("agreements")
    .select("id, version")
    .eq("group_id", params.groupId)
    .eq("status", "signed")
    .maybeSingle();
  if (!agreement) notFound();
  const { data: sections } = await db
    .from("agreement_sections")
    .select("key, title, content")
    .eq("agreement_id", agreement.id)
    .order("position");
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "signed_agreement_viewed",
    entity: "agreement",
    entityId: agreement.id,
  });

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <Link
        href="/staff/agreements"
        className="-ml-2 inline-flex h-9 w-fit items-center gap-1 rounded-full px-2 text-body-sm font-medium text-ink-2 hover:bg-surface-hover hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden /> Agreements
      </Link>
      <PageHeader
        title={allowed.members.join(", ")}
        description={`${allowed.building ?? "Not moved in"} · version ${agreement.version} · signed ${new Date(allowed.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
        className="pb-0 lg:pb-0"
      />
      <ol className="flex flex-col gap-3">
        {(sections ?? []).map((s) => (
          <li key={s.key} className="rounded-xl bg-surface p-5 ring-1 ring-line">
            <h2 className="text-body font-semibold text-ink">{s.title}</h2>
            <p className="mt-2 text-body-sm whitespace-pre-line text-ink-2">{s.content}</p>
          </li>
        ))}
      </ol>
      <p className="text-caption text-ink-3">
        A shared understanding between roommates. It isn&apos;t a lease or a legal contract.
      </p>
    </div>
  );
}
