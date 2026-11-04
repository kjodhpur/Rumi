/** Shared chores (Phase 4.3). Pure helpers for rotation templates and due dates. */

export type ChoreCadence = "daily" | "weekly" | "biweekly" | "monthly";

export const CADENCES: ChoreCadence[] = ["daily", "weekly", "biweekly", "monthly"];

/** Chores Rumi suggests; the title is stored in the language of whoever added them. */
export type ChoreKey = "trash" | "bathroom" | "kitchen" | "vacuum" | "tidy";

export interface ChoreTemplate {
  key: ChoreKey;
  cadence: ChoreCadence;
}

/** Used when the room has no agreement yet. */
export const DEFAULT_CHORE_TEMPLATES: ChoreTemplate[] = [
  { key: "trash", cadence: "weekly" },
  { key: "bathroom", cadence: "weekly" },
  { key: "kitchen", cadence: "weekly" },
  { key: "vacuum", cadence: "weekly" },
];

/**
 * Chores seeded from the agreement's cleaning section ("We rotate bathroom, kitchen and
 * trash weekly", "a quick tidy every day", or the same in Spanish). Falls back to the defaults.
 */
export function choresFromAgreement(section: string | null | undefined): ChoreTemplate[] {
  if (!section) return DEFAULT_CHORE_TEMPLATES;
  const text = section.toLowerCase();
  const cadence: ChoreCadence =
    /\bevery two weeks|biweekly|fortnight|cada dos semanas|quincenal/.test(text)
      ? "biweekly"
      : /\bmonthly|every month|cada mes|mensual/.test(text)
        ? "monthly"
        : "weekly";
  const out: ChoreTemplate[] = [];
  if (/\bbathroom|baño/.test(text)) out.push({ key: "bathroom", cadence });
  if (/\bkitchen|dishes|cocina|platos/.test(text)) out.push({ key: "kitchen", cadence });
  if (/\btrash|recycling|garbage|basura|reciclaje/.test(text)) out.push({ key: "trash", cadence });
  if (/\bvacuum|floors?\b|sweep|aspiradora|pisos?\b|barrer/.test(text))
    out.push({ key: "vacuum", cadence });
  if (/\btidy every day|daily tidy|quick tidy every day|ordenan un poco todos los días/.test(text))
    out.push({ key: "tidy", cadence: "daily" });
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
