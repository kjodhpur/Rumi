import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { loadAgreement } from "@/lib/agreements/load";
import { PrintButton } from "./print-button";
import { LOCALE_INFO } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import { sectionTitle } from "@/lib/i18n/agreements";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("agreement");
  return { title: t("title"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

/** A plain, semantic document so the browser's "Save as PDF" produces a tagged, accessible PDF. */
export default async function PrintAgreementPage({ params }: { params: { groupId: string } }) {
  if (!z.string().uuid().safeParse(params.groupId).success) notFound();
  const user = await getUser();
  if (!user) redirect(`/login?next=/print/agreement/${params.groupId}`);
  const view = await loadAgreement(params.groupId);
  if (!view?.agreement || view.agreement.stale) notFound();
  const { agreement } = view;
  const [t, locale] = await Promise.all([getT("agreement"), getLocale()]);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(LOCALE_INFO[locale].intl, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <main
      id="main"
      className="mx-auto max-w-[680px] bg-white px-8 py-12 text-[#171614] print:max-w-none print:px-0 print:py-0"
    >
      <div className="mb-8 flex items-center justify-between print:hidden">
        <p className="text-sm text-[#5e5a53]">{t("print.hint")}</p>
        <PrintButton label={t("print.button")} />
      </div>
      <article>
        <header className="border-b border-[#e7e3db] pb-6">
          <p className="text-sm font-semibold tracking-wide text-[#5e5a53] uppercase">
            {t("print.kicker")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{view.groupName}</h1>
          <p className="mt-2 text-sm text-[#5e5a53]">
            {view.members.map((m) => `${m.firstName} ${m.lastInitial}.`).join(", ")} ·{" "}
            {t("print.version", { n: agreement.version })} ·{" "}
            {agreement.signedAt
              ? t("print.signedOn", { date: date(agreement.signedAt) })
              : t("print.notSigned")}
          </p>
        </header>
        {agreement.sections.map((s) => (
          <section key={s.key} className="break-inside-avoid border-b border-[#e7e3db] py-5">
            <h2 className="text-lg font-semibold">{sectionTitle(s.key, s.title, t)}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line">{s.content}</p>
          </section>
        ))}
        <section className="break-inside-avoid pt-6">
          <h2 className="text-lg font-semibold">{t("print.signatures")}</h2>
          {agreement.signatures.length ? (
            <ul className="mt-2 space-y-1 text-[15px]">
              {agreement.signatures.map((s) => (
                <li key={s.userId}>
                  {s.typedName}, {date(s.signedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] text-[#5e5a53]">{t("print.noSignatures")}</p>
          )}
          <p className="mt-6 text-xs text-[#6f6a62]">{t("print.disclaimer")}</p>
        </section>
      </article>
    </main>
  );
}
