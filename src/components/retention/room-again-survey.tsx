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

const FRICTION_LABEL: Record<FrictionTag, string> = {
  noise: "Noise",
  guests: "Guests",
  cleanliness: "Cleanliness",
  schedule: "Schedules",
  communication: "Communication",
  other: "Something else",
};

export function RoomAgainSurvey({ context, userId }: { context: SurveyContext; userId: string }) {
  const router = useRouter();
  const [roomAgain, setRoomAgain] = React.useState<"yes" | "maybe" | "no" | "">(context.answered?.roomAgain ?? "");
  const [score, setScore] = React.useState<number | null>(context.answered?.score ?? null);
  const [tags, setTags] = React.useState<FrictionTag[]>((context.answered?.frictionTags ?? []).filter((t): t is FrictionTag => (FRICTION_TAGS as readonly string[]).includes(t)));
  const [win, setWin] = React.useState(context.answered?.biggestWin ?? "");
  const [pending, setPending] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomAgain || score === null) return void toast.error("Answer the first two questions.");
    setPending("survey");
    const result = await submitOutcomeSurvey({ roomAgain, score, frictionTags: tags, biggestWin: win });
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Thanks. Your answers stay yours; housing only sees totals.");
    router.refresh();
  }

  async function keep(groupId: string, value: boolean) {
    setPending(value ? "keep" : "leave");
    const result = await answerCarryForward(groupId, value);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(result.data.carried ? "Your group carries into the new term" : value ? "Saved. Waiting on the others." : "Saved");
    router.refresh();
  }

  const cf = context.carryForward;
  return (
    <div className="flex flex-col gap-6">
      {cf && context.group ? (
        <section className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6" aria-labelledby="keep-title">
          <h2 id="keep-title" className="flex items-center gap-2 text-body font-semibold text-ink">
            <Users className="size-4 text-ink-3" aria-hidden /> Keep {context.group.name} for {cf.toTermName}?
          </h2>
          {cf.eligible ? (
            <>
              <p className="mt-1 text-body-sm text-ink-2">
                {cf.everyoneIn ? "Everyone said they'd room together again." : `${cf.leaving.map((id) => cf.names[id] ?? "Someone").join(" and ")} won't be rooming next year, so there's space for someone new.`} One tap each carries the group forward as a confirmed pairing.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cf.carries.map((id) => (
                  <li key={id} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption", cf.keeps[id] ? "bg-success-soft text-success" : "bg-surface-sunken text-ink-2")}>
                    {cf.keeps[id] ? <Check className="size-3.5" aria-hidden /> : null}
                    {id === userId ? "You" : (cf.names[id] ?? "Roommate")}
                    <span className="sr-only">{cf.keeps[id] ? " kept the group" : cf.keeps[id] === false ? " said no" : " hasn't answered"}</span>
                  </li>
                ))}
              </ul>
              {cf.carries.includes(userId) ? (
                <div className="mt-4 flex gap-2">
                  <Button loading={pending === "keep"} disabled={cf.keeps[userId] === true} onClick={() => void keep(context.group!.id, true)}>
                    Keep our group
                  </Button>
                  <Button variant="secondary" loading={pending === "leave"} disabled={cf.keeps[userId] === false} onClick={() => void keep(context.group!.id, false)}>
                    Not this time
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-body-sm text-ink-2">
              {cf.waiting.length ? "Waiting for everyone's end-of-term answers." : "Fewer than two of you wanted to room together again, so matching starts fresh, with your answers already filled in."}
            </p>
          )}
        </section>
      ) : null}

      {!context.term ? (
        <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">Your housing office hasn&apos;t set up the current term yet.</p>
      ) : !context.open ? (
        <p className="rounded-xl bg-surface p-5 text-body-sm text-ink-2 ring-1 ring-line">
          The end-of-term survey opens three weeks before {context.term.name} ends ({new Date(`${context.term.endsOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}).
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-6 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6" noValidate>
          <div>
            <h2 className="text-body font-semibold text-ink">{context.term.name}: how did it go?</h2>
            <p className="mt-1 text-body-sm text-ink-2">Four questions. Your answers are private; your housing office sees totals only.</p>
          </div>
          <Field label="Would you room together again?">
            {({ id }) => <ChoiceChips aria-labelledby={id} value={roomAgain} onValueChange={setRoomAgain} options={[{ value: "yes", label: "Yes" }, { value: "maybe", label: "Maybe" }, { value: "no", label: "No" }]} />}
          </Field>
          <Field label="Overall, how was living together?">
            {({ id }) => (
              <ChoiceChips aria-labelledby={id} value={score === null ? "" : String(score)} onValueChange={(v) => setScore(Number(v))} options={["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v === "1" ? "1 · rough" : v === "5" ? "5 · great" : v }))} />
            )}
          </Field>
          <Field label="Biggest friction" hint="Optional. Up to three.">
            {({ id }) => <MultiChips aria-labelledby={id} value={tags} onValueChange={(v) => setTags(v.slice(-3))} options={FRICTION_TAGS.map((t) => ({ value: t, label: FRICTION_LABEL[t] }))} />}
          </Field>
          <Field label="Biggest win" hint="Optional.">
            {({ id }) => <Textarea id={id} rows={2} maxLength={300} value={win} onChange={(e) => setWin(e.target.value)} />}
          </Field>
          <Button type="submit" loading={pending === "survey"} className="self-start">
            {context.answered ? "Update answers" : "Send answers"}
          </Button>
        </form>
      )}
    </div>
  );
}
