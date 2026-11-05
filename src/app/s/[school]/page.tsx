import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, HeartHandshake, Scale } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { isSchoolSlug, normalizeSource } from "@/lib/integrations/attribution";
import { publicEnv } from "@/lib/env";
import Image from "next/image";
import { brandName, logoUrl, parseBranding } from "@/lib/staff/branding";

interface PageProps {
  params: { school: string };
  searchParams: { src?: string };
}

export const dynamic = "force-dynamic";

async function loadSchool(slug: string) {
  if (!isSchoolSlug(slug)) return null;
  const { data } = await createAdminClient()
    .from("schools")
    .select(
      "id, name, short_name, email_domains, active, sso_provider, pre_arrival_enabled, branding",
    )
    .eq("id", slug)
    .maybeSingle();
  return data?.active ? data : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const school = await loadSchool(params.school.toLowerCase());
  if (!school) return { title: "Rumi" };
  const brand = brandName(parseBranding(school.branding), school.short_name ?? school.name);
  return {
    title: `Rumi for ${brand} students`,
    description: `Roommate matching for verified ${school.name} students: two-way scores, dealbreakers respected, free.`,
  };
}

/**
 * A school's public entry point (2c + 3.3). The source in ?src= rides a signed cookie set by
 * /s/<school>/start and is recorded when the student finishes onboarding.
 */
export default async function SchoolLandingPage({ params, searchParams }: PageProps) {
  const school = await loadSchool(params.school.toLowerCase());
  if (!school) notFound();
  const source = normalizeSource(searchParams.src);
  const short = school.short_name ?? school.name;
  // White-label (Phase 9): the school's logo and name beside Rumi's wordmark, and an optional
  // decorative band. Rumi's own colors, Ember included, stay as they are.
  const branding = parseBranding(school.branding);
  const brand = brandName(branding, short);
  const logo = logoUrl(branding.logoPath);
  const domain = school.email_domains?.[0];
  const ssoReady = publicEnv.ssoEnabled && Boolean(school.sso_provider);
  const start = `/s/${school.id}/start${source === "direct" ? "" : `?src=${source}`}`;

  const points = [
    {
      icon: Scale,
      title: "Scores go both ways",
      body: "A match only ranks high when it works for both of you, not just one.",
    },
    {
      icon: BadgeCheck,
      title: `Verified ${short} students`,
      body: domain
        ? `Everyone signs in with an @${domain} email${school.pre_arrival_enabled ? " or an admitted-student invite" : ""}.`
        : "Everyone is a verified student.",
    },
    {
      icon: HeartHandshake,
      title: "Your dealbreakers hold",
      body: "Say what you can't live with and those people never show up.",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {branding.secondaryAccent ? (
        <div
          aria-hidden
          className="h-[3px]"
          style={{ backgroundColor: branding.secondaryAccent }}
        />
      ) : null}
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Rumi home" className="rounded-md text-ink">
            <Wordmark height={26} />
          </Link>
          <span className="h-6 w-px shrink-0 bg-line" aria-hidden />
          {logo ? (
            <span className="relative size-7 shrink-0 overflow-hidden rounded-sm bg-surface ring-1 ring-line">
              <Image
                src={logo}
                alt={`${school.name} logo`}
                fill
                sizes="28px"
                className="object-contain"
              />
            </span>
          ) : null}
          <span className="truncate text-body-sm text-ink-2">for {brand}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-10 pb-20 sm:px-8 lg:pt-20">
        <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">
          For {school.name} students
        </p>
        <h1 className="mt-3 max-w-[760px] font-display text-[44px] !leading-[1.04] text-ink sm:text-display-xl lg:text-display-2xl">
          Find a roommate you&apos;d <span className="italic">actually</span> live well with.
        </h1>
        <p className="mt-5 max-w-[560px] text-body text-ink-2 lg:text-body">
          Answer a few questions about sleep, cleanliness, guests and budget. Rumi ranks everyone by
          how well you&apos;d fit, and tells you why. Free for students.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="xl" className="group">
            <Link href={start}>
              {ssoReady
                ? `Continue with ${short} sign-in`
                : domain
                  ? `Start with your @${domain} email`
                  : "Get started"}
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
          <Button asChild size="xl" variant="secondary">
            <Link href="/#ranking">How it works</Link>
          </Button>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl bg-surface p-5 ring-1 ring-line">
              <span className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent-ink">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <h2 className="mt-4 text-body font-semibold text-ink">{title}</h2>
              <p className="mt-1 text-body-sm text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
