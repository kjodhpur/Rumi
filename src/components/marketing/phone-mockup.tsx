"use client";

import * as React from "react";
import { Bell, Compass, MessageCircle, Search, SlidersHorizontal, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Monogram } from "@/components/ui/monogram";
import { MatchCard } from "@/components/matches/match-card";
import { cn } from "@/lib/utils";
import { MOCK_CARDS } from "./mock-data";

/**
 * A phone running the real matches screen: the app's own components laid out
 * at 375×812 and scaled down. `inert` keeps the mockup out of the tab order.
 */
export function PhoneMockup({ className }: { className?: string }) {
  const screenRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    screenRef.current?.setAttribute("inert", "");
  }, []);

  return (
    <div
      className={cn("relative [--s:0.7] sm:[--s:0.78] lg:[--s:0.8]", className)}
      style={{ width: "calc(375px * var(--s) + 20px)" }}
    >
      {/* Side buttons */}
      <span aria-hidden className="absolute top-[22%] -left-[3px] h-14 w-[3px] rounded-l-sm bg-[#2a2826]" />
      <span aria-hidden className="absolute top-[32%] -left-[3px] h-14 w-[3px] rounded-l-sm bg-[#2a2826]" />
      <span aria-hidden className="absolute top-[26%] -right-[3px] h-20 w-[3px] rounded-r-sm bg-[#2a2826]" />

      <div className="rounded-[calc(55px*var(--s)+10px)] bg-[#141312] p-[10px] shadow-lg ring-1 ring-black/10 dark:ring-white/10">
        <div
          ref={screenRef}
          aria-hidden
          className="relative overflow-hidden rounded-[calc(55px*var(--s))] bg-bg select-none"
          style={{ width: "calc(375px * var(--s))", height: "calc(812px * var(--s))" }}
        >
          <div className="absolute top-0 left-0 h-[812px] w-[375px] origin-top-left" style={{ transform: "scale(var(--s))" }}>
            <MatchesScreen />
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchesScreen() {
  return (
    <div className="relative flex h-full flex-col bg-bg text-ink">
      <StatusBar />
      <div className="flex h-12 items-center justify-between px-4">
        <Wordmark height={21} />
        <span className="relative flex size-10 items-center justify-center">
          <Bell className="size-[22px]" strokeWidth={1.75} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-accent ring-2 ring-bg" />
        </span>
      </div>
      <div className="px-4 pt-1">
        <p className="font-display text-display-md">Matches</p>
        <p className="mt-0.5 text-body-sm text-ink-2">128 students, ranked for you</p>
      </div>
      <div className="flex gap-2 px-4 pt-4">
        <span className="flex h-10 flex-1 items-center gap-2 rounded-md bg-surface px-3 text-body-sm text-ink-3 shadow-xs ring-1 ring-line-strong ring-inset">
          <Search className="size-[18px]" strokeWidth={1.75} /> Search
        </span>
        <span className="flex h-10 items-center gap-2 rounded-md bg-surface px-3 text-body-sm font-medium shadow-xs ring-1 ring-line-strong ring-inset">
          <SlidersHorizontal className="size-[18px]" strokeWidth={1.75} /> Filters
          <span className="flex size-5 items-center justify-center rounded-full bg-ink text-micro text-ink-inverse">2</span>
        </span>
      </div>
      <div className="flex flex-col gap-7 px-4 pt-5">
        <MatchCard data={MOCK_CARDS[0]} animateScore morph={false} />
        <MatchCard data={MOCK_CARDS[1]} morph={false} />
      </div>

      <div className="glass absolute inset-x-0 bottom-0 border-t border-line pb-6">
        <div className="grid h-16 grid-cols-4">
          {[
            { icon: Compass, label: "Matches", active: true },
            { icon: MessageCircle, label: "Messages", badge: 2 },
            { icon: Users, label: "Groups" },
          ].map(({ icon: Icon, label, active, badge }) => (
            <span key={label} className={cn("relative flex flex-col items-center justify-center gap-1", active ? "text-ink" : "text-ink-3")}>
              <span className="relative">
                <Icon className="size-6" strokeWidth={1.75} />
                {badge ? (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-semibold text-on-accent">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="text-micro font-medium">{label}</span>
            </span>
          ))}
          <span className="flex flex-col items-center justify-center gap-1 text-ink-3">
            <Monogram name="You" seed="you" className="size-6 [container-type:size]" />
            <span className="text-micro font-medium">You</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="relative flex h-[50px] items-end justify-between px-8 pb-2 text-[15px] font-semibold">
      <span className="tabular">9:41</span>
      <span aria-hidden className="absolute top-3 left-1/2 h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-[#0b0a09]" />
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-3 w-4" fill="currentColor">
          <path d="M8 2.4c2.2 0 4.2.8 5.7 2.2l1.1-1.2A9.8 9.8 0 0 0 8 .8 9.8 9.8 0 0 0 1.2 3.4l1.1 1.2A8.2 8.2 0 0 1 8 2.4Zm0 3.2c1.3 0 2.5.5 3.4 1.3l1.1-1.2A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.5 1.7l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3Zm0 3.2c.5 0 .9.2 1.2.5L8 10.6 6.8 9.3c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <span className="relative flex h-3 w-6 items-center rounded-[4px] border border-current/40 p-px">
          <span className="h-full w-[78%] rounded-[2px] bg-current" />
          <span className="absolute top-1/2 -right-[3px] h-1 w-[2px] -translate-y-1/2 rounded-r-sm bg-current/40" />
        </span>
      </span>
    </div>
  );
}
