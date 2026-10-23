"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHasSession } from "./session-aware";

const LINKS = [
  { href: "#ranking", label: "How it works" },
  { href: "#why", label: "Why you match" },
  { href: "#safety", label: "Safety" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const signedIn = useHasSession();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled ? "glass border-line" : "border-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-8">
        <Link href="/" className="rounded-sm text-ink" aria-label="Rumi home">
          <Wordmark height={24} />
        </Link>
        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3 py-2 text-body-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/matches">
                Open Rumi <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="h-9 px-3">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="h-9 px-4">
                <Link href="/login">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
