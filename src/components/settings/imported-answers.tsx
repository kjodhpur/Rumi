"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImportedAnswers } from "@/app/actions/starrez";
import { useOptions, useT } from "@/components/providers/i18n";

/** One tap to use the answers (they replace what's in your profile), or one to ignore them. */
export function ImportedAnswers({
  answers,
}: {
  answers: { factor: string; value: string; current: string }[];
}) {
  const router = useRouter();
  const t = useT("settingsPages");
  const { FACTOR_LABELS, SCALES } = useOptions();
  const label = (factor: string) =>
    factor === "sleep_schedule"
      ? SCALES.sleep_schedule.label
      : (FACTOR_LABELS[factor as keyof typeof FACTOR_LABELS] ?? factor);
  const pretty = (factor: string, value: string) => {
    const n = Number(value);
    if (
      (factor === "sleep_schedule" ||
        factor === "cleanliness" ||
        factor === "noise" ||
        factor === "guests") &&
      n >= 1 &&
      n <= 5
    )
      return t(`imported.scale.${factor}.v${n as 1 | 2 | 3 | 4 | 5}`);
    return value.replace(/_/g, " ");
  };
  const [pending, setPending] = React.useState<"yes" | "no" | null>(null);
  if (!answers.length)
    return (
      <EmptyState
        icon={<Check strokeWidth={1.75} />}
        title={t("imported.none")}
        description={t("imported.noneBody")}
      />
    );

  async function resolve(confirm: boolean) {
    setPending(confirm ? "yes" : "no");
    const r = await resolveImportedAnswers(confirm);
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success(confirm ? t("imported.added") : t("imported.ignored"));
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
            <span className="text-ink-2">{label(a.factor)}</span>
            <span className="text-right">
              <span className="font-medium text-ink">{pretty(a.factor, a.value)}</span>
              {a.current && a.current !== a.value ? (
                <span className="block text-caption text-ink-3">
                  {t("imported.profileSays", { value: pretty(a.factor, a.current) })}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button loading={pending === "yes"} onClick={() => void resolve(true)}>
          <Check aria-hidden /> {t("imported.use")}
        </Button>
        <Button variant="secondary" loading={pending === "no"} onClick={() => void resolve(false)}>
          {t("imported.ignore")}
        </Button>
      </div>
    </div>
  );
}
