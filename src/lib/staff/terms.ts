/** Housing terms: shared by staff server code and client screens. */

export interface Term {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  deadlines: {
    roommateRequest?: string;
    selectionOpens?: string;
    selectionCloses?: string;
    agreementDue?: string;
  };
}

export const DEADLINE_LABELS: Record<keyof Term["deadlines"], string> = {
  roommateRequest: "Roommate request deadline",
  selectionOpens: "Room selection opens",
  selectionCloses: "Room selection closes",
  agreementDue: "Roommate agreement due",
};

/** The next deadline on or after today, for the overview header. */
export function nextDeadline(term: Term | null, today = new Date().toISOString().slice(0, 10)) {
  if (!term) return null;
  const upcoming = (
    Object.entries(term.deadlines) as [keyof Term["deadlines"], string | undefined][]
  )
    .filter(
      (entry): entry is [keyof Term["deadlines"], string] =>
        Boolean(entry[1]) && entry[1]! >= today,
    )
    .sort((a, b) => a[1].localeCompare(b[1]));
  if (upcoming.length === 0) return null;
  const [key, date] = upcoming[0];
  const daysLeft = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  return { label: DEADLINE_LABELS[key], date, daysLeft };
}
