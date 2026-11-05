import Link from "next/link";
import { Check, FileSignature, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar } from "@/components/ui/avatar";
import { ScoreRing } from "@/components/ui/score-ring";
import type { ParentSummary } from "@/lib/family/scope";
import { LAUNCH_SCHOOL } from "@/lib/school";
import type { Translator } from "@/lib/i18n/core";

/** Read-only family summary. Server-rendered; nothing on it is interactive. */
export function ParentView({
  summary,
  t,
  intl,
}: {
  summary: ParentSummary;
  t: Translator<"family">;
  intl: string;
}) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center bg-bg px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-[480px] flex-1 flex-col">
        <Link href="/" className="mx-auto rounded-sm text-ink" aria-label={t("home")}>
          <Wordmark height={24} />
        </Link>

        <section
          className="mt-10 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8"
          aria-labelledby="family-title"
        >
          <div className="flex items-center gap-3">
            <Avatar src={summary.studentAvatarUrl} firstName={summary.studentFirstName} size={48} />
            <div className="min-w-0">
              <h1 id="family-title" className="font-display text-display-sm text-ink">
                {t("title", { name: summary.studentFirstName })}
              </h1>
              {summary.groupName ? (
                <p className="text-caption text-ink-3">{summary.groupName}</p>
              ) : null}
            </div>
          </div>

          {summary.roommates.length === 0 ? (
            <p className="mt-6 text-body-sm text-ink-2">
              {t("noneYet", { name: summary.studentFirstName })}
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {summary.roommates.map((r, i) => (
                <li key={i} className="rounded-lg bg-surface-sunken p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={r.avatarUrl} firstName={r.avatarUrl ? r.name : null} size={40} />
                      <p className="truncate text-body-sm font-medium text-ink">{r.name}</p>
                    </div>
                    {r.score !== null ? (
                      <ScoreRing score={r.score} size={52} variant="hero" />
                    ) : null}
                  </div>
                  {r.reasons.length ? (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {r.reasons.map((reason) => (
                        <li key={reason} className="flex items-start gap-2 text-caption text-ink-2">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-accent-ink" aria-hidden />{" "}
                          {reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {summary.agreementStatus ? (
            <p className="mt-6 flex items-start gap-2 text-body-sm text-ink-2">
              <FileSignature className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />{" "}
              {t(`agreement.${summary.agreementStatus}`)}
            </p>
          ) : null}
        </section>

        <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-caption text-ink-3">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("shared", {
            name: summary.studentFirstName,
            date: new Date(summary.expiresAt).toLocaleDateString(intl, {
              month: "long",
              day: "numeric",
            }),
          })}
        </p>

        <footer className="mt-auto pt-12 text-center text-caption text-ink-3">
          {t("footer", { school: LAUNCH_SCHOOL.name })}
        </footer>
      </div>
    </main>
  );
}
