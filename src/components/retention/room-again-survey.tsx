"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips, MultiChips } from "@/components/ui/choice";
import { answerCarryForward, submitOutcomeSurvey } from "@/app/actions/outcome-surveys";
import { FRICTION_TAGS, type FrictionTag } from "@/lib/retention/rematch";
import type { SurveyContext } from "@/lib/retention/survey";
import { cn } from "@/lib/utils";
import { useIntlLocale, useT } from "@/components/providers/i18n";

export function RoomAgainSurvey({ context, userId }: { context: SurveyContext; userId: string }) {
  const router = useRouter();
  const t = useT("retention");
  const intl = useIntlLocale();
  const [roomAgain, setRoomAgain] = React.useState<"yes" | "maybe" | "no" | "">(
    context.answered?.roomAgain ?? "",
  );
  const [score, setScore] = React.useState<number | null>(context.answered?.score ?? null);
  const [tags, setTags] = React.useState<FrictionTag[]>(
    (context.answered?.frictionTags ?? []).filter((tag): tag is FrictionTag =>
      (FRICTION_TAGS as readonly string[]).includes(tag),
    ),
  );
  const [win, setWin] = React.useState(context.answered?.biggestWin ?? "");
  const [pending, setPending] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomAgain || score === null) return void toast.error(t("survey.answerFirst"));
    setPending("survey");
    const result = await submitOutcomeSurvey({
      roomAgain,
      score,
      frictionTags: tags,
      biggestWin: win,
    });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(t("survey.thanks"));
    router.refresh();
  }

  async function keep(groupId: string, value: boolean) {
    setPending(value ? "keep" : "leave");
    const result = await answerCarryForward(groupId, value);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(
      result.data.carried
        ? t("survey.carried")
        : value
          ? t("survey.savedWaiting")
          : t("survey.saved"),
    );
    router.refresh();
  }

  const cf = context.carryForward;
  return (
    <div className="flex flex-col gap-6">
      {cf && context.group ? (
        <section
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
          aria-labelledby="keep-title"
        >
          <h2 id="keep-title" className="flex items-center gap-2 text-body font-semibold text-ink">
            <Users className="size-4 text-ink-3" aria-hidden />{" "}
            {t("survey.keepTitle", { group: context.group.name, term: cf.toTermName })}
          </h2>
          {cf.eligible ? (
            <>
              <p className="mt-1 text-body-sm text-ink-2">
                {cf.everyoneIn
                  ? t("survey.everyoneIn")
                  : t("survey.leaving", {
                      names: cf.leaving
                        .map((id) => cf.names[id] ?? t("survey.someone"))
                        .join(t("survey.and")),
                      count: cf.leaving.length,
                    })}{" "}
                {t("survey.oneTap")}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cf.carries.map((id) => (
                  <li
                    key={id}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption",
                      cf.keeps[id]
                        ? "bg-success-soft text-success"
                        : "bg-surface-sunken text-ink-2",
                    )}
                  >
                    {cf.keeps[id] ? <Check className="size-3.5" aria-hidden /> : null}
                    {id === userId ? t("survey.you") : (cf.names[id] ?? t("survey.roommate"))}
                    <span className="sr-only">
                      {cf.keeps[id]
                        ? t("survey.keptSr")
                        : cf.keeps[id] === false
                          ? t("survey.saidNoSr")
                          : t("survey.notAnsweredSr")}
                    </span>
                  </li>
                ))}
              </ul>
              {cf.carries.includes(userId) ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    loading={pending === "keep"}
                    disabled={cf.keeps[userId] === true}
                    onClick={() => void keep(context.group!.id, true)}
                  >
                    {t("survey.keep")}
                  </Button>
                  <Button
                    variant="secondary"
                    loading={pending === "leave"}
                    disabled={cf.keeps[userId] === false}
                    onClick={() => void keep(context.group!.id, false)}
                  >
                    {t("survey.notThisTime")}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-body-sm text-ink-2">
              {cf.waiting.length ? t("survey.waitingAll") : t("survey.fresh")}
            </p>
          )}
        </section>
      ) : null}

      {!context.term ? (
        <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">
          {t("survey.noTerm")}
        </p>
      ) : !context.open ? (
        <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">
          {t("survey.opensOn", {
            term: context.term.name,
            date: new Date(`${context.term.endsOn}T12:00:00Z`).toLocaleDateString(intl, {
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            }),
          })}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="flex flex-col gap-6 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
          noValidate
        >
          <div>
            <h2 className="text-body font-semibold text-ink">
              {t("survey.howDid", { term: context.term.name })}
            </h2>
            <p className="mt-1 text-body-sm text-ink-2">{t("survey.fourQuestions")}</p>
          </div>
          <Field label={t("survey.again")}>
            {({ id }) => (
              <ChoiceChips
                aria-labelledby={id}
                value={roomAgain}
                onValueChange={setRoomAgain}
                options={[
                  { value: "yes", label: t("survey.yes") },
                  { value: "maybe", label: t("survey.maybe") },
                  { value: "no", label: t("survey.no") },
                ]}
              />
            )}
          </Field>
          <Field label={t("survey.overall")}>
            {({ id }) => (
              <ChoiceChips
                aria-labelledby={id}
                value={score === null ? "" : String(score)}
                onValueChange={(v) => setScore(Number(v))}
                options={["1", "2", "3", "4", "5"].map((v) => ({
                  value: v,
                  label:
                    v === "1"
                      ? t("survey.rough", { n: 1 })
                      : v === "5"
                        ? t("survey.great", { n: 5 })
                        : v,
                }))}
              />
            )}
          </Field>
          <Field label={t("survey.friction")} hint={t("survey.frictionHint")}>
            {({ id }) => (
              <MultiChips
                aria-labelledby={id}
                value={tags}
                onValueChange={(v) => setTags(v.slice(-3))}
                options={FRICTION_TAGS.map((tag) => ({
                  value: tag,
                  label: t(`survey.frictionTags.${tag}`),
                }))}
              />
            )}
          </Field>
          <Field label={t("survey.win")} hint={t("survey.winHint")}>
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                maxLength={300}
                value={win}
                onChange={(e) => setWin(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={pending === "survey"} className="self-start">
            {context.answered ? t("survey.update") : t("survey.send")}
          </Button>
        </form>
      )}
    </div>
  );
}
