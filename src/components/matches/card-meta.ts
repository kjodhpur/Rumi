import { labelOf } from "@/lib/options";
import { formatBudget } from "@/lib/utils";
import { formatCalendarDate } from "@/lib/time";
import type { LocalizedOptions } from "@/lib/i18n/options";

export function metaLine(
  classYear: string | null,
  major: string | null,
  years: LocalizedOptions["CLASS_YEARS"],
) {
  return [labelOf(years, classYear), major].filter(Boolean).join(" · ");
}

export function moveInLabel(date: string | null, intl = "en-US") {
  return date ? formatCalendarDate(date, undefined, intl) : null;
}

/** "$800–$1,100 · Moves Aug 1 · Tempe"; `moves` renders the move-in part in the reader's language. */
export function housingLine(
  budgetMin: number,
  budgetMax: number,
  moveIn: string | null,
  area: string | undefined,
  moves: (date: string) => string,
  intl = "en-US",
) {
  const date = moveIn ? moveInLabel(moveIn, intl) : null;
  return [formatBudget(budgetMin, budgetMax), date ? moves(date) : null, area]
    .filter(Boolean)
    .join(" · ");
}
