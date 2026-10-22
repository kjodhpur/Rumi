"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import Lenis from "lenis";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const mockCards = [
  { name: "Maya R.", score: 94, reason: "Same sleep · Tempe" },
  { name: "Jordan K.", score: 91, reason: "Shared artists · budget" },
  { name: "Sam T.", score: 88, reason: "3 mutuals · Fall 2027" },
];

function AssemblingCard({
  card,
  index,
  progress,
}: {
  card: (typeof mockCards)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const y = useTransform(progress, (v) => (1 - v) * (40 + index * 28) + index * 72 * v);
  const x = useTransform(progress, (v) => (1 - v) * (index - 1) * 80);
  const opacity = useTransform(progress, [0, 0.2, 1], [0.45, 0.9, 1]);

  return (
    <motion.div
      style={{ y, x, opacity }}
      className="absolute left-0 right-0 mx-auto max-w-md rounded-lg border border-border bg-bg-elevated p-4 shadow-elevation2"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-ui font-semibold">{card.name}</p>
          <p className="text-sm text-ink-muted">{card.reason}</p>
        </div>
        <span className="font-ui text-lg font-bold tabular-nums text-accent">{card.score}%</span>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const assemble = useTransform(scrollYProgress, [0.15, 0.55], [0, 1]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-hero-atmosphere text-ink">
      <header className="mx-auto flex max-w-content items-center justify-between px-4 py-5">
        <Wordmark size="md" className="text-accent" />
        <Link
          href="/login"
          className="font-ui text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </header>

      <main>
        <section className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden">
          <div
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--bg)_92%,transparent)] via-[color-mix(in_srgb,var(--bg)_70%,transparent)] to-transparent" />
          <div className="relative mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-content flex-col justify-center px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-w-xl space-y-5"
            >
              <Wordmark as="h1" size="hero" className="text-accent" />
              <p className="font-ui text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Ranked roommate matches for ASU — free, no swiping.
              </p>
              <p className="max-w-md text-ink-muted">{APP_TAGLINE}</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/login">
                  <Button size="lg">Sign up with ASU email</Button>
                </Link>
                <a href="#how">
                  <Button size="lg" variant="outline">
                    How it works
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section ref={sectionRef} id="how" className="border-t border-border py-24">
          <div className="mx-auto max-w-content px-4">
            <h2 className="font-ui text-3xl font-bold tracking-brand text-ink">How it works</h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Set prefs once. Browse a ranked list with clear why-you-match reasons — and a trust web of
              mutuals.
            </p>
            <div className="relative mt-14 h-[320px]">
              {mockCards.map((card, i) => (
                <AssemblingCard key={card.name} card={card} index={i} progress={assemble} />
              ))}
            </div>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Tell us your prefs",
                  d: "Housing, lifestyle scales, dealbreakers, and what matters most.",
                },
                {
                  n: "2",
                  t: "Optionally connect Spotify",
                  d: "Music taste folds into your score. Fully optional.",
                },
                {
                  n: "3",
                  t: "Intro, then chat",
                  d: "Send an intro. Chat unlocks when they accept — with mutual trust signals.",
                },
              ].map((step) => (
                <li key={step.n} className="space-y-2">
                  <span className="font-ui inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-contrast">
                    {step.n}
                  </span>
                  <h3 className="font-ui text-xl font-semibold">{step.t}</h3>
                  <p className="text-sm text-ink-muted">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-bg-muted/40 py-20">
          <div className="mx-auto max-w-content px-4">
            <h2 className="font-ui text-3xl font-bold tracking-brand text-ink">Trust & safety</h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Verified school email. No full last names. Blocks work both ways. Reports go to admins.
              Mutuals show shared connections and campus orgs — never scraped Instagram follows. Pause or
              delete anytime.
            </p>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="font-ui text-3xl font-bold tracking-brand text-ink">FAQ</h2>
            <dl className="mt-8 space-y-6">
              {[
                {
                  q: "Who can join?",
                  a: "Students with a valid school email (ASU @asu.edu at launch). Domains are school-configurable.",
                },
                { q: "Is it free?", a: "Yes. Rumi is free for students." },
                {
                  q: "Do I have to connect Spotify?",
                  a: "No. Without it, matching uses lifestyle and housing only.",
                },
                {
                  q: "Is this an official ASU product?",
                  a: "No. Rumi is an independent student project using ASU maroon for familiarity.",
                },
              ].map((item) => (
                <div key={item.q}>
                  <dt className="font-ui font-semibold">{item.q}</dt>
                  <dd className="mt-1 text-sm text-ink-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-ink-muted">
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-accent">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-accent">
            Terms
          </Link>
          <Link href="/login" className="hover:text-accent">
            Sign up
          </Link>
        </div>
        <p className="mt-3">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </div>
  );
}
