import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Wordmark } from "@/components/brand/wordmark";
import { normalizeSource } from "@/lib/integrations/attribution";
import { LAUNCH_SCHOOL } from "@/lib/school";

interface PageProps {
  params: { school: string };
  searchParams: { src?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const schoolSlug = params.school.toLowerCase();
  const schoolName = schoolSlug === "asu" ? "Arizona State University" : schoolSlug.toUpperCase();
  return {
    title: `Find Your Roommate — Rumi for ${schoolName}`,
    description: `Verified roommate matching for ${schoolName} students. Mutual compatibility, lifestyle fit, zero swiping.`,
  };
}

export default async function SchoolPortalLandingPage({ params, searchParams }: PageProps) {
  const schoolSlug = params.school.toLowerCase();
  const db = createAdminClient();

  const { data: school } = await db
    .from("schools")
    .select("id, name, short_name, email_domains")
    .eq("id", schoolSlug)
    .maybeSingle();

  // If school is not found in database, check if it's the launch school
  const activeSchool = school ?? (schoolSlug === "asu" ? {
    id: "asu",
    name: LAUNCH_SCHOOL.name,
    short_name: "ASU",
    email_domains: [LAUNCH_SCHOOL.domain],
  } : null);

  if (!activeSchool) {
    notFound();
  }

  const source = normalizeSource(searchParams.src);

  // Record attribution asynchronously
  try {
    await db.from("link_attributions").insert({
      school_id: activeSchool.id,
      source,
    });
  } catch (err) {
    // Non-blocking log error
    console.error("[attribution] Failed to record source", err);
  }

  const sourceLabels: Record<string, string> = {
    starrez: "StarRez Housing Portal",
    canvas: "Canvas Course / LMS",
    asuapp: "ASU Mobile App",
    qr: "Campus Housing QR Code",
    email: "Housing Office Invitation",
    direct: "Direct Link",
  };

  const domainHint = activeSchool.email_domains?.[0] ? `@${activeSchool.email_domains[0]}` : "";

  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col justify-between px-4 py-8 sm:px-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between border-b border-border-subtle pb-6">
        <Link href="/" aria-label="Rumi home">
          <Wordmark height={28} />
        </Link>
        <span className="text-caption font-medium bg-sand px-3 py-1.5 rounded-full text-ink-2">
          {activeSchool.short_name} Housing Partner
        </span>
      </header>

      <main className="py-12 sm:py-16 space-y-8">
        {source !== "direct" && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-ember/10 text-ember text-caption font-medium rounded-full">
            <span>Arrived from {sourceLabels[source] || source}</span>
          </div>
        )}

        <div className="space-y-4">
          <h1 className="font-serif text-3xl sm:text-5xl text-ink leading-tight">
            Meet your ideal roommate at {activeSchool.name}.
          </h1>
          <p className="text-body-lg text-ink-2 max-w-2xl leading-relaxed">
            Mutual compatibility scoring based on sleep schedule, cleanliness, study habits, and lifestyle.
            No swiping, no algorithmic mystery, and completely free for students.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <h3 className="font-medium text-ink">Two-Way Fit</h3>
            <p className="text-caption text-ink-3">
              Scores reflect both people&apos;s preferences. No one-sided matching.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <h3 className="font-medium text-ink">Verified Students Only</h3>
            <p className="text-caption text-ink-3">
              Only authenticated {domainHint} accounts enter the housing pool.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <h3 className="font-medium text-ink">StarRez Sync Ready</h3>
            <p className="text-caption text-ink-3">
              Confirmed roommate groups can be directly exported to campus housing.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Link
            href={`/login?school=${activeSchool.id}&src=${source}`}
            className="inline-flex justify-center items-center px-6 py-3.5 bg-ember text-canvas rounded-lg font-medium shadow-sm hover:opacity-95 transition-opacity"
          >
            Continue with {activeSchool.short_name} Email
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-6 py-3.5 bg-surface text-ink border border-border-subtle rounded-lg font-medium hover:bg-sand transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </main>

      <footer className="border-t border-border-subtle pt-6 text-caption text-ink-3 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>Rumi · 100% Free for Students · FERPA Compliant</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
