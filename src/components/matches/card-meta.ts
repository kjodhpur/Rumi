import { format, parseISO } from "date-fns";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import { formatBudget } from "@/lib/utils";

export function metaLine(classYear: string | null, major: string | null) {
  return [labelOf(CLASS_YEARS, classYear), major].filter(Boolean).join(" · ");
}

export function moveInLabel(date: string | null) {
  if (!date) return null;
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return null;
  }
}

export function housingLine(budgetMin: number, budgetMax: number, moveIn: string | null, area?: string) {
  return [formatBudget(budgetMin, budgetMax), moveIn ? `Moves ${moveInLabel(moveIn)}` : null, area]
    .filter(Boolean)
    .join(" · ");
}
