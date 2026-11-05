"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adoptWeightModel, retireWeightModel, runWeightFit } from "@/app/actions/weight-models";
import { DEFAULT_IMPORTANCE, FACTOR_LABELS, IMPORTANCE } from "@/lib/options";
import type { LifestyleFactor } from "@/lib/matching/weights-optimizer";

export interface WeightModelView {
  id: string;
  status: "suggested" | "adopted";
  createdAt: string;
  rows: number;
  positives: number;
  auc: number;
  terms: number;
  factors: {
    factor: LifestyleFactor;
    coef: number;
    low: number;
    high: number;
    evidence: "positive" | "negative" | "none";
    suggested: number;
  }[];
}

const EVIDENCE: Record<WeightModelView["factors"][number]["evidence"], string> = {
  positive: "More mismatch, more friction",
  negative: "More mismatch, less friction",
  none: "No clear link",
};

/** Outcome-trained weights review (1.G). Never adopted automatically. */
export function WeightModels({
  schoolId,
  models,
}: {
  schoolId: string;
  models: WeightModelView[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const run = async (
    key: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
  ) => {
    setPending(key);
    const r = await fn();
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(done);
    router.refresh();
  };

  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="wm-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[560px]">
          <h2 id="wm-title" className="text-body font-semibold text-ink">
            Weights from your outcomes
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            After a term ends, Rumi can check which lifestyle mismatches went with room changes or
            unhappy roommates, using only students who agreed to research use. Adopting changes the
            default importance for factors students haven&apos;t set. Their own choices always win.
          </p>
        </div>
        <Button
          variant="secondary"
          loading={pending === "run"}
          onClick={() => void run("run", () => runWeightFit(schoolId), "Analysis ready to review")}
        >
          Run analysis
        </Button>
      </div>

      {models.length === 0 ? (
        <p className="mt-4 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2">
          No analysis yet. It needs at least 200 consented roommate pairs from a finished term.
        </p>
      ) : (
        models.map((m) => (
          <div key={m.id} className="mt-5 rounded-lg ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <Badge variant={m.status === "adopted" ? "success" : "accent"}>
                {m.status === "adopted" ? "In use" : "Suggestion"}
              </Badge>
              <span className="text-caption text-ink-3">
                {m.rows.toLocaleString("en-US")} pairs · {m.positives.toLocaleString("en-US")} with
                friction · {m.terms} {m.terms === 1 ? "term" : "terms"} · AUC {m.auc.toFixed(2)}{" "}
                (in-sample)
              </span>
            </div>
            <div
              role="region"
              tabIndex={0}
              aria-label="Factor estimates"
              className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <table className="w-full min-w-[560px] text-left text-body-sm">
                <caption className="sr-only">Factor estimates</caption>
                <thead className="text-caption text-ink-3">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Factor
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Effect (95% interval)
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Reading
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Default now → suggested
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {m.factors.map((f) => (
                    <tr key={f.factor}>
                      <th scope="row" className="px-4 py-2 font-medium text-ink">
                        {FACTOR_LABELS[f.factor]}
                      </th>
                      <td className="px-4 py-2 text-ink-2 tabular-nums">
                        {f.coef.toFixed(2)} ({f.low.toFixed(2)} to {f.high.toFixed(2)})
                      </td>
                      <td className="px-4 py-2 text-ink-2">{EVIDENCE[f.evidence]}</td>
                      <td className="px-4 py-2 text-ink">
                        {IMPORTANCE[DEFAULT_IMPORTANCE[f.factor]].short} →{" "}
                        <span
                          className={
                            f.suggested !== DEFAULT_IMPORTANCE[f.factor]
                              ? "font-semibold"
                              : undefined
                          }
                        >
                          {IMPORTANCE[f.suggested as 0 | 1 | 2 | 3].short}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
              {m.status === "suggested" ? (
                <>
                  <Button
                    size="sm"
                    loading={pending === `a-${m.id}`}
                    onClick={() =>
                      void run(
                        `a-${m.id}`,
                        () => adoptWeightModel(schoolId, m.id),
                        "Adopted. Matches are updating.",
                      )
                    }
                  >
                    Adopt as defaults
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pending === `r-${m.id}`}
                    onClick={() =>
                      void run(
                        `r-${m.id}`,
                        () => retireWeightModel(schoolId, m.id),
                        "Suggestion discarded",
                      )
                    }
                  >
                    Discard
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pending === `r-${m.id}`}
                  onClick={() =>
                    void run(
                      `r-${m.id}`,
                      () => retireWeightModel(schoolId, m.id),
                      "Back to Rumi's defaults. Matches are updating.",
                    )
                  }
                >
                  Stop using
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
