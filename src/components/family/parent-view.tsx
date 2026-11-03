"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, FileSignature, HelpCircle, HeartHandshake } from "lucide-react";
import { ScoreRing } from "@/components/ui/score-ring";
import type { ParentMatchSummary } from "@/lib/family/scope";

interface ParentViewProps {
  summary: ParentMatchSummary;
}

export function ParentView({ summary }: ParentViewProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[var(--bg-canvas)] px-4 py-8 text-[var(--fg-canvas)]">
      {/* Header */}
      <header className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] font-sans text-sm font-bold text-white">
            R
          </span>
          Rumi
        </Link>
        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--fg-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
          Family Summary
        </span>
      </header>

      {/* Main Content */}
      <main className="my-auto flex w-full max-w-md flex-col items-center py-6">
        <div className="w-full overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl">
          {/* Top Banner */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
              <HeartHandshake className="h-4 w-4" />
              <span>Student Roommate Overview</span>
            </div>
            <span className="text-[11px] font-medium text-[var(--fg-muted)]">
              Read-only view
            </span>
          </div>

          {/* Student & Roommate Display */}
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex items-center -space-x-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg-canvas)] text-xl font-bold text-[var(--fg-canvas)] shadow">
                {summary.studentFirstName.charAt(0)}
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xl font-bold text-[var(--fg-muted)] shadow">
                {summary.roommateDisplayName.charAt(0)}
              </div>
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
              {summary.studentFirstName} & {summary.roommateDisplayName}
            </h1>
            <p className="text-xs text-[var(--fg-muted)]">College Roommate Compatibility</p>
          </div>

          {/* Compatibility Score */}
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-[var(--bg-canvas)]/60 p-4">
            <ScoreRing
              score={summary.score}
              size={80}
              strokeWidth={6}
              variant="hero"
              animateOnMount
            />
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
              Overall Compatibility
            </span>
          </div>

          {/* Top Compatibility Reasons */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Key Shared Habits
            </h3>
            <ul className="mt-2.5 space-y-2">
              {summary.reasons.length > 0 ? (
                summary.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-3 text-sm text-[var(--fg-canvas)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{reason}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-3 text-sm text-[var(--fg-muted)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>Aligned study schedules and daily routines.</span>
                </li>
              )}
            </ul>
          </div>

          {/* Agreement Status */}
          {summary.agreementStatus ? (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 p-3.5 text-xs">
              <span className="flex items-center gap-2 font-medium text-[var(--fg-canvas)]">
                <FileSignature className="h-4 w-4 text-[var(--accent)]" />
                Digital Roommate Agreement
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-600 capitalize">
                {summary.agreementStatus}
              </span>
            </div>
          ) : null}

          {/* Student Privacy Reassurance */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--fg-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Strict student privacy: private chats, room numbers, and contact info are never shared.</span>
          </div>
        </div>

        {/* Helpful Info for Parents */}
        <div className="mt-6 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-4 text-xs text-[var(--fg-muted)] space-y-2">
          <p className="flex items-center gap-1 font-semibold text-[var(--fg-canvas)]">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
            About this view
          </p>
          <p>
            Your student shared this link with you from their Rumi account. Rumi helps college students find compatible roommates through two-way lifestyle alignment.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-[var(--fg-muted)]">
        <p>Rumi • Verified college roommate matching</p>
      </footer>
    </div>
  );
}
