"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Monogram } from "@/components/ui/monogram";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { useHasSession } from "./session-aware";

export function FinalCta() {
  const signedIn = useHasSession();
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-8 lg:pb-32">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 rounded-2xl bg-surface p-8 shadow-md ring-1 ring-line sm:p-12 lg:flex-row lg:items-end lg:justify-between lg:p-16">
        <div>
          <div aria-hidden className="mb-8 flex">
            {["Maya", "Jordan", "Priya", "Diego", "Ava"].map((name) => (
              <span key={name} className="-ml-2.5 rounded-full ring-4 ring-surface first:ml-0">
                <Monogram name={name} seed={`cta-${name}`} className="size-11 [container-type:size]" />
              </span>
            ))}
          </div>
          <h2 id="cta-title" className="max-w-[640px] font-display text-[40px] !leading-[1.05] text-ink sm:text-display-xl lg:text-display-2xl">
            Your future roommate is <span className="italic">already here.</span>
          </h2>
          <p className="mt-4 text-body text-ink-2">
            Free · Verified {LAUNCH_SCHOOL.shortName} students only · About four minutes to set up
          </p>
        </div>
        <Button asChild size="xl" className="group shrink-0">
          <Link href={signedIn ? "/matches" : "/login"}>
            {signedIn ? "Open your matches" : "Find your matches"}
            <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
