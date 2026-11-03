/** Shared chores (Phase 4.3). Pure helpers for rotation templates and due dates. */

export type ChoreCadence = "daily" | "weekly" | "biweekly" | "monthly";

export const CADENCE_LABEL: Record<ChoreCadence, string> = {
  daily: "Every day",
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};

export interface ChoreTemplate {
  title: string;
  cadence: ChoreCadence;
}

/** Used when the room has no agreement yet. */
export const DEFAULT_CHORE_TEMPLATES: ChoreTemplate[] = [
  { title: "Trash and recycling", cadence: "weekly" },
  { title: "Bathroom", cadence: "weekly" },
  { title: "Kitchen and counters", cadence: "weekly" },
  { title: "Vacuum the shared space", cadence: "weekly" },
];

/**
 * Chores seeded from the agreement's cleaning section ("We rotate bathroom, kitchen and
 * trash weekly", "a quick tidy every day"). Falls back to the defaults.
 */
export function choresFromAgreement(section: string | null | undefined): ChoreTemplate[] {
  if (!section) return DEFAULT_CHORE_TEMPLATES;
  const text = section.toLowerCase();
  const cadence: ChoreCadence = /\bevery two weeks|biweekly|fortnight/.test(text) ? "biweekly" : /\bmonthly|every month/.test(text) ? "monthly" : "weekly";
  const out: ChoreTemplate[] = [];
  if (/\bbathroom/.test(text)) out.push({ title: "Bathroom", cadence });
  if (/\bkitchen|dishes/.test(text)) out.push({ title: "Kitchen and counters", cadence });
  if (/\btrash|recycling|garbage/.test(text)) out.push({ title: "Trash and recycling", cadence });
  if (/\bvacuum|floors?\b|sweep/.test(text)) out.push({ title: "Vacuum the shared space", cadence });
  if (/\btidy every day|daily tidy|quick tidy every day/.test(text)) out.push({ title: "Quick tidy of shared spaces", cadence: "daily" });
  return out.length ? out : DEFAULT_CHORE_TEMPLATES;
}

/** First due date for a new chore: today for daily chores, otherwise the coming weekend. */
export function firstDueDate(today: string, cadence: ChoreCadence): string {
  if (cadence === "daily") return today;
  const d = new Date(`${today}T12:00:00Z`);
  const toSunday = (7 - d.getUTCDay()) % 7;
  d.setUTCDate(d.getUTCDate() + toSunday);
  return d.toISOString().slice(0, 10);
}

/** Whose turn is it next, after `last`? Wraps around; unknown people restart the wheel. */
export function nextInRotation(rotation: string[], last: string | null): string | null {
  if (!rotation.length) return null;
  const i = last ? rotation.indexOf(last) : -1;
  return rotation[(i + 1) % rotation.length]!;
}
