"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { MultiChips } from "@/components/ui/choice";
import { CLASS_YEARS, ROOMMATE_GENDERS } from "@/lib/options";
import { formatMoney } from "@/lib/utils";
import type { FeedFilters } from "@/lib/matches";

const MIN = 300;
const MAX = 2500;

export function FiltersSheet({
  open,
  onOpenChange,
  filters,
  areas,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FeedFilters;
  areas: { slug: string; name: string }[];
  onApply: (next: FeedFilters) => void;
}) {
  const [draft, setDraft] = React.useState(filters);
  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const budget: [number, number] = [draft.budgetMin ?? MIN, draft.budgetMax ?? MAX];
  const set = (patch: Partial<FeedFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const clear = () =>
    setDraft({ ...draft, budgetMin: null, budgetMax: null, areas: [], moveFrom: null, moveTo: null, genders: [], years: [] });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filters"
      description="Narrow your ranked list. Your dealbreakers always apply."
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" onClick={clear}>
            Clear all
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Show matches
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-body font-medium text-ink">Budget</legend>
          <p className="text-body-sm text-ink-2 tabular" aria-live="polite">
            {formatMoney(budget[0])} – {formatMoney(budget[1])}
            {budget[1] === MAX ? "+" : ""} / month
          </p>
          <Slider
            min={MIN}
            max={MAX}
            step={50}
            minStepsBetweenThumbs={1}
            value={budget}
            onValueChange={([lo, hi]) => set({ budgetMin: lo === MIN ? null : lo, budgetMax: hi === MAX ? null : hi })}
            thumbLabels={["Minimum budget", "Maximum budget"]}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">Neighborhoods</legend>
          <MultiChips
            aria-label="Neighborhoods"
            value={draft.areas}
            onValueChange={(next) => set({ areas: next })}
            options={areas.map((a) => ({ value: a.slug, label: a.name.split(" — ")[0] }))}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">Move-in between</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              aria-label="Earliest move-in"
              value={draft.moveFrom ?? ""}
              onChange={(e) => set({ moveFrom: e.target.value || null })}
            />
            <Input
              type="date"
              aria-label="Latest move-in"
              value={draft.moveTo ?? ""}
              min={draft.moveFrom ?? undefined}
              onChange={(e) => set({ moveTo: e.target.value || null })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-body font-medium text-ink">Gender</legend>
          <p className="mb-3 text-body-sm text-ink-3">Only people open to living with you appear either way.</p>
          <MultiChips
            aria-label="Gender"
            value={draft.genders}
            onValueChange={(next) => set({ genders: next })}
            options={ROOMMATE_GENDERS}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">Year</legend>
          <MultiChips
            aria-label="Year"
            value={draft.years}
            onValueChange={(next) => set({ years: next })}
            options={CLASS_YEARS}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
