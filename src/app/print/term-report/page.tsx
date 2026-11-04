import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { loadTermReport } from "@/lib/staff/term-report-load";
import { METHODOLOGY, reportRows } from "@/lib/staff/term-report";
import { PrintButton } from "../agreement/[groupId]/print-button";

export const metadata: Metadata = { title: "Term report", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Printable term report (Phase 1 + 6.3): the browser's print dialog saves it as a PDF. */
export default async function TermReportPage() {
  const context = await requireStaffPage("viewDashboard");
  const report = await loadTermReport(context);
  await logAudit({
    actorId: context.userId,
    schoolId: context.school.id,
    action: "term_report_exported",
    entity: "term_report",
    meta: { format: "print" },
  });
  const rows = reportRows(report).filter(
    (r) => r.section !== "About" && r.section !== "Methodology",
  );
  const sections = [...new Set(rows.map((r) => r.section))];

  return (
    <main
      id="main"
      className="mx-auto max-w-[820px] bg-white px-8 py-12 text-[#171614] print:max-w-none print:px-0 print:py-0"
    >
      <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-[#5e5a53]">
          Use your browser&apos;s print dialog and choose &ldquo;Save as PDF&rdquo;.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/api/staff/report"
            className="text-sm font-medium text-[#b83f1b] underline-offset-4 hover:underline"
          >
            Download CSV
          </a>
          <PrintButton />
        </div>
      </div>
      <header className="border-b border-[#e7e3db] pb-6">
        <p className="text-sm font-semibold tracking-wide text-[#5e5a53] uppercase">
          Rumi term report
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{report.school}</h1>
        <p className="mt-2 text-sm text-[#5e5a53]">
          {report.term ?? "No active term"} · Generated {report.generatedAt}
        </p>
        {report.synthetic ? (
          <p className="mt-4 rounded-md bg-[#fbeee6] px-3 py-2 text-sm font-medium text-[#8a3416]">
            Synthetic data for demonstration. These numbers are not real outcomes.
          </p>
        ) : null}
      </header>

      {sections.map((section) => {
        const list = rows.filter((r) => r.section === section);
        const showN = list.some((r) => r.n);
        const showNote = list.some((r) => r.note);
        return (
          <section key={section} className="break-inside-avoid border-b border-[#e7e3db] py-6">
            <h2 className="text-lg font-semibold">{section}</h2>
            <table className="mt-3 w-full text-left text-[14px]">
              <thead className="text-[12px] text-[#6f6a62]">
                <tr>
                  <th scope="col" className="py-1.5 font-medium">
                    Measure
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Value
                  </th>
                  {showN ? (
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Out of
                    </th>
                  ) : null}
                  {showNote ? (
                    <th scope="col" className="py-1.5 pl-4 font-medium">
                      Note
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efebe4]">
                {list.map((r, i) => (
                  <tr key={`${r.measure}-${i}`}>
                    <th scope="row" className="py-1.5 font-normal">
                      {r.measure}
                    </th>
                    <td className="py-1.5 text-right tabular-nums">{r.value}</td>
                    {showN ? (
                      <td className="py-1.5 text-right text-[#5e5a53] tabular-nums">{r.n}</td>
                    ) : null}
                    {showNote ? <td className="py-1.5 pl-4 text-[#5e5a53]">{r.note}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section className="break-inside-avoid py-6">
        <h2 className="text-lg font-semibold">Methodology</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-[#3d3a35]">
          {METHODOLOGY.map((m) => (
            <li key={m}>{m}</li>
          ))}
          {report.outcomes ? (
            <li>
              Comparison groups:{" "}
              {report.outcomes.cohorts
                .map((c) => `${c.name} (${c.arm === "rumi" ? "Rumi" : "comparison"})`)
                .join("; ")}
              .
            </li>
          ) : null}
        </ul>
        <p className="mt-6 text-xs text-[#6f6a62]">
          Made with Rumi. Totals only; no student is named in this report.
        </p>
      </section>
    </main>
  );
}
