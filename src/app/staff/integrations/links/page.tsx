import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { CopyButton } from "@/components/ui/copy-button";
import {
  SOURCES,
  SOURCE_LABEL,
  buildDeepLink,
  canvasLink,
  portalEmbedSnippet,
  type AttributionSource,
} from "@/lib/integrations/attribution";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Entry links" };
export const dynamic = "force-dynamic";

const USE: Record<AttributionSource, string> = {
  starrez: "The StarRez resident portal (use the button below).",
  canvas: "A Canvas module or announcement, as an external URL.",
  asuapp: "A tile or link in the campus mobile app.",
  qr: "Printed posters, move-in flyers and slides.",
  email: "Housing office emails and newsletters.",
  direct: "Anywhere else. Counted as direct.",
};

export default async function EntryLinksPage() {
  const context = await requireStaffPage("viewDashboard");
  const school = context.school;
  const base = absoluteUrl("/");
  const { data: bySource } = await createAdminClient().rpc("staff_signups_by_source", {
    p_school: school.id,
  });
  const counts = new Map((bySource ?? []).map((r) => [r.source, r]));
  const qr = await QRCode.toString(buildDeepLink(base, school.id, "qr"), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#171614", light: "#ffffff" },
  });
  const qrHref = `data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`;
  const snippet = portalEmbedSnippet(base, school.id, school.shortName || school.name);
  const canvas = canvasLink(base, school.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Entry links"
        description="Links for each place students find Rumi. Sign-ups are counted by where they came from, as totals only."
        className="pb-0 lg:pb-0"
      />

      <section aria-labelledby="links-title" className="flex flex-col gap-2">
        <h2
          id="links-title"
          className="text-caption font-semibold tracking-wide text-ink-3 uppercase"
        >
          Links
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {SOURCES.map((source) => {
            const link = buildDeepLink(base, school.id, source);
            const row = counts.get(source);
            return (
              <li key={source} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-ink">{SOURCE_LABEL[source]}</p>
                  <p className="text-caption text-ink-3">{USE[source]}</p>
                  <code className="mt-1 block truncate text-caption text-ink-2">{link}</code>
                </div>
                <span className="text-body-sm text-ink-2 tabular-nums">
                  {row ? (row.suppressed ? "<5" : (row.n ?? 0).toLocaleString("en-US")) : "0"}{" "}
                  sign-ups
                </span>
                <CopyButton value={link} />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="portal-title"
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        >
          <h2 id="portal-title" className="text-body font-semibold text-ink">
            StarRez portal button
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            Paste into a portal page&apos;s HTML. It uses inline styles because portals strip
            stylesheets.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-surface-sunken p-3 text-caption whitespace-pre-wrap text-ink-2">
            {snippet}
          </pre>
          <div className="mt-3">
            <CopyButton value={snippet} label="Copy HTML" />
          </div>
        </section>

        <section
          aria-labelledby="qr-title"
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        >
          <h2 id="qr-title" className="text-body font-semibold text-ink">
            QR code
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            Points at the QR link above, so scans are counted separately.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
            <img
              src={qrHref}
              alt={`QR code for ${buildDeepLink(base, school.id, "qr")}`}
              width={160}
              height={160}
              className="rounded-md ring-1 ring-line"
            />
            <a
              href={qrHref}
              download={`rumi-${school.id}-qr.svg`}
              className="text-body-sm font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              Download SVG
            </a>
          </div>
        </section>

        <section
          aria-labelledby="canvas-title"
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6 lg:col-span-2"
        >
          <h2 id="canvas-title" className="text-body font-semibold text-ink">
            Canvas
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            In a module, choose Add item → External URL. Use the name and URL below and tick
            &quot;Load in a new tab&quot;. Rumi doesn&apos;t use LTI or read anything from Canvas.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
            <dt className="text-caption text-ink-3">Page name</dt>
            <dd className="text-body-sm text-ink">{canvas.title}</dd>
            <dd>
              <CopyButton value={canvas.title} />
            </dd>
            <dt className="text-caption text-ink-3">URL</dt>
            <dd className="truncate text-body-sm text-ink">
              <code>{canvas.url}</code>
            </dd>
            <dd>
              <CopyButton value={canvas.url} />
            </dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
