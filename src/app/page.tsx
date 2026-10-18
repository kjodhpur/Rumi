import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hero-mesh text-rumi-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl font-bold tracking-tight text-asu-maroon">
          {APP_NAME}
        </span>
        <Link
          href="/login"
          className="text-sm font-semibold text-asu-maroon underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-6xl items-center gap-10 px-4 pb-16 pt-6 lg:grid-cols-2">
          <div className="animate-fade-up space-y-6">
            <p className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-asu-maroon sm:text-6xl md:text-7xl">
              {APP_NAME}
            </p>
            <h1 className="max-w-xl text-balance text-2xl font-medium text-rumi-ink sm:text-3xl">
              Ranked roommate matches for ASU students — free, filterable, no swiping.
            </h1>
            <p className="max-w-md text-rumi-muted">{APP_TAGLINE}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg">Sign up with your ASU email</Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">
                  How it works
                </Button>
              </a>
            </div>
          </div>

          <div
            className="animate-fade-up-delay relative hidden min-h-[420px] overflow-hidden rounded-none lg:block"
            aria-hidden
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-asu-maroon/50 via-transparent to-transparent" />
            <div className="animate-soft-pulse absolute bottom-8 left-8 right-8 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-asu-maroon">
                Compatibility
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-rumi-ink">92% match</p>
              <p className="text-sm text-rumi-muted">Lifestyle + music taste · Tempe · Fall 2027</p>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-rumi-sand bg-white/50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-semibold text-asu-maroon">How it works</h2>
            <p className="mt-2 max-w-xl text-rumi-muted">
              Three steps. No endless swiping — just ranked compatibility.
            </p>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Tell us your prefs",
                  d: "Housing budget, lifestyle scales, dealbreakers, and what matters most.",
                },
                {
                  n: "2",
                  t: "Optionally connect Spotify",
                  d: "We fold music taste into your score so shared playlists become shared apartments.",
                },
                {
                  n: "3",
                  t: "Browse ranked matches",
                  d: "Filter, save, and message the people who actually fit.",
                },
              ].map((step) => (
                <li key={step.n} className="space-y-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-asu-gold font-display font-bold text-asu-maroon">
                    {step.n}
                  </span>
                  <h3 className="font-display text-xl font-semibold">{step.t}</h3>
                  <p className="text-sm text-rumi-muted">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-semibold text-asu-maroon">Privacy promise</h2>
            <p className="mt-3 max-w-2xl text-rumi-muted">
              We never show your full last name, email, or exact address. Blocks work both ways.
              Reports go to admins. Spotify tokens are encrypted. You can pause or delete your account
              anytime.
            </p>
          </div>
        </section>

        <section className="border-t border-rumi-sand bg-white/60 py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="font-display text-3xl font-semibold text-asu-maroon">FAQ</h2>
            <dl className="mt-8 space-y-6">
              {[
                {
                  q: "Who can join?",
                  a: "Anyone with a valid @asu.edu email. We enforce this server-side.",
                },
                {
                  q: "Is it free?",
                  a: "Yes. Rumi is free for ASU students.",
                },
                {
                  q: "Do I have to connect Spotify?",
                  a: "No — it is optional. Without it, matching uses lifestyle and housing only.",
                },
                {
                  q: "Is this an official ASU product?",
                  a: "No. Rumi is an independent student project using ASU colors for familiarity.",
                },
              ].map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-1 text-sm text-rumi-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-rumi-sand py-8 text-center text-sm text-rumi-muted">
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-asu-maroon">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-asu-maroon">
            Terms
          </Link>
          <Link href="/login" className="hover:text-asu-maroon">
            Sign up
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} {APP_NAME}</p>
      </footer>
    </div>
  );
}
