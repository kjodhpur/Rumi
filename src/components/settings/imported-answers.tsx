"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImportedAnswers } from "@/app/actions/starrez";

const LABEL: Record<string, string> = {
  sleep_schedule: "Sleep schedule",
  cleanliness: "Cleanliness",
  noise: "Noise",
  guests: "Guests",
  smoking: "Smoking",
  drinking: "Drinking",
  pets: "Pets",
  study: "Study habits",
};
const SCALE: Record<string, string[]> = {
  sleep_schedule: ["Early bird", "Before midnight", "Around midnight", "After 1am", "Night owl"],
  cleanliness: ["Relaxed", "Fairly relaxed", "In between", "Tidy", "Spotless"],
  noise: ["Quiet", "Mostly quiet", "In between", "Lively", "Loud"],
  guests: ["Rarely", "Now and then", "Sometimes", "Often", "All the time"],
};
const pretty = (factor: string, value: string) =>
  SCALE[factor]?.[Number(value) - 1] ?? value.replace(/_/g, " ");

/** One tap to use the answers (they replace what's in your profile), or one to ignore them. */
export function ImportedAnswers({
  answers,
}: {
  answers: { factor: string; value: string; current: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"yes" | "no" | null>(null);
  if (!answers.length)
    return (
      <EmptyState
        icon={<Check strokeWidth={1.75} />}
        title="Nothing to confirm"
        description="When your housing office shares your questionnaire answers, they'll show up here."
      />
    );

  async function resolve(confirm: boolean) {
    setPending(confirm ? "yes" : "no");
    const r = await resolveImportedAnswers(confirm);
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success(
      confirm
        ? "Added to your profile. Your matches are updating."
        : "Ignored. Your profile stays as it is.",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line">
        {answers.map((a) => (
          <li
            key={a.factor}
            className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm"
          >
            <span className="text-ink-2">{LABEL[a.factor] ?? a.factor}</span>
            <span className="text-right">
              <span className="font-medium text-ink">{pretty(a.factor, a.value)}</span>
              {a.current && a.current !== a.value ? (
                <span className="block text-caption text-ink-3">
                  Your profile says {pretty(a.factor, a.current)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button loading={pending === "yes"} onClick={() => void resolve(true)}>
          <Check aria-hidden /> Use these answers
        </Button>
        <Button variant="secondary" loading={pending === "no"} onClick={() => void resolve(false)}>
          Ignore
        </Button>
      </div>
    </div>
  );
}
