"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Check, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { respondToSuggestion } from "@/app/actions/suggestions";
import { labelOf } from "@/lib/options";
import { useOptions, useT } from "@/components/providers/i18n";

interface Props {
  id: string;
  office: string;
  status: string;
  myAnswer: boolean | null;
  groupId: string | null;
  /** Everyone else in the suggestion: one for a pair, two or three for a group (1.C). */
  others: Other[];
}

interface Other {
  id: string;
  firstName: string;
  lastInitial: string;
  classYear: string | null;
  major: string | null;
  photoUrl: string | null;
  score: number | null;
  reasons: string[];
  watchouts: string[];
}

export function HousingSuggestion({ id, office, status, myAnswer, groupId, others }: Props) {
  const router = useRouter();
  const t = useT("profile");
  const [pending, setPending] = React.useState<"yes" | "no" | null>(null);

  async function answer(accept: boolean) {
    setPending(accept ? "yes" : "no");
    const result = await respondToSuggestion(id, accept);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    if (result.data.state === "accepted")
      toast.success(group ? t("suggestion.everyoneYes") : t("suggestion.bothYes"), {
        description: t("suggestion.chatOpen"),
      });
    else if (result.data.state === "waiting")
      toast.success(t("suggestion.gotIt"), {
        description: group ? t("suggestion.waitEveryone") : t("suggestion.waitThem"),
      });
    else if (result.data.state === "invalid")
      toast(t("suggestion.closed"), { description: t("suggestion.closedHint") });
    else toast(t("suggestion.declined"), { description: t("suggestion.declinedHint") });
    router.refresh();
  }

  const group = others.length > 1;
  const names = others.map((o) => o.firstName);
  const together =
    names.length <= 1
      ? (names[0] ?? t("suggestion.yourSuggestion"))
      : t("suggestion.and", {
          list: names.slice(0, -1).join(", "),
          last: names[names.length - 1] ?? "",
        });
  const open = status === "sent" && myAnswer === null;

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 pt-2 lg:pt-0">
      <p className="flex items-center gap-2 text-caption font-semibold tracking-wide text-accent-ink uppercase">
        <Building2 className="size-4" strokeWidth={2} aria-hidden />{" "}
        {t("suggestion.by", { office })}
      </p>
      <h1 className="-mt-3 font-display text-display-md text-ink lg:text-display-lg">
        {group ? t("suggestion.meetGroup") : t("suggestion.meet", { names: together })}
      </h1>
      {group ? (
        <p className="-mt-3 text-body text-ink-2">
          {t("suggestion.room", { size: others.length + 1, names: together })}
        </p>
      ) : null}

      {others.map((other) => (
        <OtherCard key={other.id} other={other} compact={group} />
      ))}

      {open ? (
        <div className="flex flex-col gap-3">
          <p className="text-body-sm text-ink-2">
            {group
              ? t("suggestion.explainGroup")
              : t("suggestion.explain", { name: names[0] ?? t("suggestion.they") })}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              loading={pending === "no"}
              disabled={pending !== null}
              onClick={() => void answer(false)}
            >
              {t("suggestion.no")}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              loading={pending === "yes"}
              disabled={pending !== null}
              onClick={() => void answer(true)}
            >
              {t("suggestion.yes")}
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg bg-surface-sunken px-4 py-3.5 text-body-sm text-ink"
        >
          {status === "accepted" ? (
            <span className="flex flex-wrap items-center justify-between gap-3">
              {group ? t("suggestion.everyoneSaid") : t("suggestion.bothSaid")}
              {groupId ? (
                <Button asChild size="sm">
                  <Link href={`/groups/${groupId}`}>{t("suggestion.openGroup")}</Link>
                </Button>
              ) : null}
            </span>
          ) : status === "declined" ? (
            t("suggestion.isClosed")
          ) : status === "invalid" ? (
            t("suggestion.invalid")
          ) : myAnswer === true ? (
            group ? (
              t("suggestion.saidYesGroup")
            ) : (
              t("suggestion.saidYes", { name: names[0] ?? t("suggestion.they") })
            )
          ) : (
            t("suggestion.isClosed")
          )}
        </div>
      )}
    </div>
  );
}

function OtherCard({ other, compact }: { other: Other; compact: boolean }) {
  const t = useT("profile");
  const { CLASS_YEARS } = useOptions();
  const name = `${other.firstName}${other.lastInitial ? ` ${other.lastInitial}.` : ""}`;
  return (
    <section
      aria-label={t("suggestion.aboutName", { name })}
      className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:p-6"
    >
      <div className="flex items-center gap-4">
        <Avatar
          src={other.photoUrl}
          firstName={other.firstName}
          lastInitial={other.lastInitial}
          size={compact ? 48 : 64}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title font-semibold text-ink">{name}</p>
          <p className="text-body-sm text-ink-2">
            {[other.classYear ? labelOf(CLASS_YEARS, other.classYear) : null, other.major]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {other.score !== null ? (
          <ScoreRing score={other.score} size={compact ? 48 : 56} animateOnMount />
        ) : null}
      </div>
      {other.reasons.length > 0 ? (
        <div className="mt-5">
          <h2 className="flex items-center gap-1.5 text-caption font-medium text-ink-3 uppercase">
            <Sparkles className="size-3.5" strokeWidth={2} aria-hidden /> {t("why")}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {other.reasons.slice(0, compact ? 2 : 3).map((r) => (
              <li key={r} className="flex gap-2 text-body-sm text-ink">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-success"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {other.watchouts.length > 0 ? (
        <div className="mt-4">
          <h2 className="flex items-center gap-1.5 text-caption font-medium text-ink-3 uppercase">
            <MessageCircleQuestion className="size-3.5" strokeWidth={2} aria-hidden />{" "}
            {t("suggestion.worth")}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-body-sm text-ink-2">
            {other.watchouts.slice(0, compact ? 1 : 2).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button asChild variant="link" className="mt-4 px-0">
        <Link href={`/profile/${other.id}`}>{t("suggestion.full")}</Link>
      </Button>
    </section>
  );
}
