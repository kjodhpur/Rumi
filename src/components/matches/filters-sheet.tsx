"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { MultiChips } from "@/components/ui/choice";
import { useOptions, useT } from "@/components/providers/i18n";
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
  const t = useT("matches");
  const { CLASS_YEARS, ROOMMATE_GENDERS } = useOptions();
  const [draft, setDraft] = React.useState(filters);
  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const budget: [number, number] = [draft.budgetMin ?? MIN, draft.budgetMax ?? MAX];
  const set = (patch: Partial<FeedFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const clear = () =>
    setDraft({
      ...draft,
      budgetMin: null,
      budgetMax: null,
      areas: [],
      moveFrom: null,
      moveTo: null,
      genders: [],
      years: [],
    });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("filters")}
      description={t("sheet.description")}
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" onClick={clear}>
            {t("sheet.clearAll")}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            {t("sheet.show")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-body font-medium text-ink">{t("sheet.budget")}</legend>
          <p className="text-body-sm text-ink-2 tabular" aria-live="polite">
            {formatMoney(budget[0])} – {formatMoney(budget[1])}
            {budget[1] === MAX ? "+" : ""} {t("sheet.perMonth")}
          </p>
          <Slider
            min={MIN}
            max={MAX}
            step={50}
            minStepsBetweenThumbs={1}
            value={budget}
            onValueChange={([lo, hi]) =>
              set({ budgetMin: lo === MIN ? null : lo, budgetMax: hi === MAX ? null : hi })
            }
            thumbLabels={[t("sheet.minBudget"), t("sheet.maxBudget")]}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">{t("sheet.areas")}</legend>
          <MultiChips
            aria-label={t("sheet.areas")}
            value={draft.areas}
            onValueChange={(next) => set({ areas: next })}
            options={areas.map((a) => ({ value: a.slug, label: a.name.split(" — ")[0] }))}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">{t("sheet.moveIn")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              aria-label={t("sheet.earliest")}
              value={draft.moveFrom ?? ""}
              onChange={(e) => set({ moveFrom: e.target.value || null })}
            />
            <Input
              type="date"
              aria-label={t("sheet.latest")}
              value={draft.moveTo ?? ""}
              min={draft.moveFrom ?? undefined}
              onChange={(e) => set({ moveTo: e.target.value || null })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-body font-medium text-ink">{t("sheet.gender")}</legend>
          <p className="mb-3 text-body-sm text-ink-3">{t("sheet.genderHint")}</p>
          <MultiChips
            aria-label={t("sheet.gender")}
            value={draft.genders}
            onValueChange={(next) => set({ genders: next })}
            options={ROOMMATE_GENDERS}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-body font-medium text-ink">{t("sheet.year")}</legend>
          <MultiChips
            aria-label={t("sheet.year")}
            value={draft.years}
            onValueChange={(next) => set({ years: next })}
            options={CLASS_YEARS}
          />
        </fieldset>
      </div>
    </Sheet>
  );
}
