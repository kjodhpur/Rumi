import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

/** Shared frame for Privacy and Terms: readable measure, calm typography. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <SiteNav anchorBase="/" />
      <main id="main" className="mx-auto max-w-[720px] px-4 pt-32 pb-24 sm:px-8 lg:pt-40">
        <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">Last updated {updated}</p>
        <h1 className="mt-3 font-display text-[44px] !leading-[1.05] text-ink sm:text-display-xl">{title}</h1>
        <div className="mt-6 text-title font-normal text-ink-2">{intro}</div>
        <div
          className={[
            "mt-12 text-body text-ink-2",
            "[&_h2]:mt-14 [&_h2]:font-display [&_h2]:text-display-sm [&_h2]:text-ink sm:[&_h2]:text-display-md",
            "[&_h3]:mt-8 [&_h3]:text-title [&_h3]:text-ink",
            "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
            "[&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4",
            "[&_strong]:font-semibold [&_strong]:text-ink",
          ].join(" ")}
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
