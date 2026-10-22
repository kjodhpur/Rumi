"use client";

import { useState, useTransition } from "react";
import { updateGroupHousing } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PREFERRED_AREAS } from "@/lib/constants";

export function GroupHousingForm({
  groupId,
  initial,
}: {
  groupId: string;
  initial: {
    budgetMin: number;
    budgetMax: number;
    preferredAreas: string[];
    moveInDate: string | null;
    bedroomsWanted: number;
  };
}) {
  const [budgetMin, setBudgetMin] = useState(initial.budgetMin);
  const [budgetMax, setBudgetMax] = useState(initial.budgetMax);
  const [areas, setAreas] = useState<string[]>(initial.preferredAreas);
  const [moveInDate, setMoveInDate] = useState(initial.moveInDate ?? "");
  const [bedrooms, setBedrooms] = useState(initial.bedroomsWanted);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateGroupHousing({
            groupId,
            budgetMin,
            budgetMax,
            preferredAreas: areas,
            moveInDate: moveInDate || null,
            bedroomsWanted: bedrooms,
          });
          setMsg(res.error ?? "Saved");
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="bmin">Budget min</Label>
          <Input
            id="bmin"
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bmax">Budget max</Label>
          <Input
            id="bmax"
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="beds">Bedrooms wanted</Label>
        <Input
          id="beds"
          type="number"
          min={1}
          max={4}
          value={bedrooms}
          onChange={(e) => setBedrooms(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mid">Move-in date</Label>
        <Input
          id="mid"
          type="date"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-ui text-sm font-medium">Preferred areas</legend>
        <div className="flex flex-wrap gap-2">
          {PREFERRED_AREAS.map((area) => {
            const on = areas.includes(area);
            return (
              <button
                key={area}
                type="button"
                className={`font-ui rounded-full px-3 py-1 text-xs font-medium ${
                  on ? "bg-accent text-accent-contrast" : "bg-bg-muted text-ink-muted"
                }`}
                onClick={() =>
                  setAreas((prev) => (on ? prev.filter((a) => a !== area) : [...prev, area]))
                }
              >
                {area}
              </button>
            );
          })}
        </div>
      </fieldset>
      {msg ? <p className="text-sm text-ink-muted">{msg}</p> : null}
      <Button type="submit" disabled={pending}>
        Save prefs
      </Button>
    </form>
  );
}
