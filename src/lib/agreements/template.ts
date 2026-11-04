/**
 * The default roommate agreement, prefilled from the members' profiles. Pure:
 * the server passes everyone's preferences and the pairwise watch-outs in.
 */

import { createTranslator, type Translator } from "@/lib/i18n/core";
import { en } from "@/lib/i18n/messages/en";

export interface MemberPrefs {
  id: string;
  firstName: string;
  sleepSchedule: number; // 1 early … 5 late
  cleanliness: number; // 1 relaxed … 5 spotless
  noise: number; // 1 quiet … 5 loud
  guests: number; // 1 rarely … 5 often
  smoking: string; // never | sometimes | regularly
  drinking: string; // never | socially | often
  pets: string; // none | have | want
}

export interface DraftSection {
  key: string;
  title: string;
  content: string;
}

const SLOTS = ["t0", "t1", "t2", "t3", "t4"] as const;
const OVERNIGHTS = [0, 1, 2, 3, 3];

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n))) - 1;
const EN = createTranslator("en", en, en, "agreement");

/** The first draft. `t` writes it in the language of whoever starts the agreement. */
export function buildDraft(
  members: MemberPrefs[],
  watchouts: string[],
  t: Translator<"agreement"> = EN,
): DraftSection[] {
  const earliest = Math.min(...members.map((m) => m.sleepSchedule));
  const tidiest = Math.max(...members.map((m) => m.cleanliness));
  const quietest = Math.min(...members.map((m) => m.noise));
  const fewestGuests = Math.min(...members.map((m) => m.guests));
  const anyoneNoSmoke = members.some((m) => m.smoking === "never");
  const anyoneNoDrink = members.some((m) => m.drinking === "never");
  const petOwners = members.filter((m) => m.pets === "have").map((m) => m.firstName);
  const anyoneNoPets = members.some((m) => m.pets === "none");
  const overnights = OVERNIGHTS[clamp(fewestGuests)] ?? 0;
  const slot = SLOTS[clamp(earliest)]!;
  const examSlot = SLOTS[Math.max(0, clamp(earliest) - 1)]!;
  const section = (key: (typeof BUILT_IN_SECTIONS)[number]["key"], content: string) => ({
    key,
    title: t(`sections.${key}`),
    content,
  });

  const sections: DraftSection[] = [
    section(
      "sleep",
      t("draft.sleep", {
        weeknight: t(`draft.weeknight.${slot}`),
        weekend: t(`draft.weekend.${slot}`),
      }),
    ),
    section("cleaning", tidiest >= 4 ? t("draft.cleaningTidy") : t("draft.cleaning")),
    section(
      "guests",
      overnights === 0 ? t("draft.guestsAsk") : t("draft.guests", { count: overnights }),
    ),
    section("noise", quietest <= 2 ? t("draft.noiseQuiet") : t("draft.noise")),
    section("shared", t("draft.shared")),
    section(
      "substances",
      [
        anyoneNoSmoke ? t("draft.noSmoke") : t("draft.smokeOutside"),
        anyoneNoDrink ? t("draft.drinkLow") : t("draft.drinkFine"),
        petOwners.length && anyoneNoPets
          ? t("draft.petStays", { names: petOwners.join(t("and")) })
          : petOwners.length
            ? t("draft.petOwners")
            : t("draft.noNewPets"),
      ].join(" "),
    ),
    section("study", t("draft.study", { time: t(`draft.weeknight.${examSlot}`) })),
    section("temperature", t("draft.temperature")),
    section("conflict", t("draft.conflict")),
  ];

  if (watchouts.length > 0) {
    sections.push(
      section(
        "talk",
        `${t("draft.talk")}\n${[...new Set(watchouts)].map((w) => `• ${w}`).join("\n")}`,
      ),
    );
  }
  return sections;
}

// ─────────────────────────────────────────────────────────────────────────────
// School templates (Phase 4): which sections appear, their order and titles, the school's
// own guidance under a section, and fixed sections such as hall policies.
// ─────────────────────────────────────────────────────────────────────────────

export const BUILT_IN_SECTIONS = [
  { key: "sleep", title: "Sleep and quiet hours" },
  { key: "cleaning", title: "Cleaning and chores" },
  { key: "guests", title: "Guests and overnights" },
  { key: "noise", title: "Noise" },
  { key: "shared", title: "Shared items and food" },
  { key: "substances", title: "Smoking, drinking and pets" },
  { key: "study", title: "Study time" },
  { key: "temperature", title: "Temperature" },
  { key: "conflict", title: "When something bugs us" },
  { key: "talk", title: "Talk about this" },
] as const;

export interface TemplateSection {
  key: string;
  title: string;
  enabled: boolean;
  /** Built-in sections: the school's note added under the prefilled text. Custom: the text. */
  text: string;
  custom: boolean;
}

export function defaultTemplate(): TemplateSection[] {
  return BUILT_IN_SECTIONS.map((s) => ({
    key: s.key,
    title: s.title,
    enabled: true,
    text: "",
    custom: false,
  }));
}

const BUILT_IN_KEYS = new Set<string>(BUILT_IN_SECTIONS.map((s) => s.key));
const builtInTitle = (key: string) => BUILT_IN_SECTIONS.find((s) => s.key === key)?.title;

/** A stored template, or null when it isn't one. Unknown or duplicate keys are dropped. */
export function parseTemplate(value: unknown): TemplateSection[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const out: TemplateSection[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const key = typeof r.key === "string" ? r.key : "";
    if (!/^[a-z_]{2,32}$/.test(key) || seen.has(key)) continue;
    const custom = r.custom === true;
    if (!custom && !BUILT_IN_KEYS.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      custom,
      title:
        typeof r.title === "string" && r.title.trim()
          ? r.title.trim().slice(0, 80)
          : (BUILT_IN_SECTIONS.find((s) => s.key === key)?.title ?? key),
      enabled: r.enabled !== false,
      text: typeof r.text === "string" ? r.text.slice(0, 1500) : "",
    });
  }
  return out.length ? out : null;
}

/**
 * The draft for a group under its school's template. Built-in sections keep the text prefilled
 * from the members' profiles; any built-in the template doesn't mention (added to Rumi later)
 * goes at the end so nothing is silently lost.
 */
export function applyTemplate(
  draft: DraftSection[],
  template: TemplateSection[] | null,
): DraftSection[] {
  if (!template) return draft;
  const out: DraftSection[] = [];
  for (const t of template) {
    if (!t.enabled) continue;
    if (t.custom) {
      if (t.text.trim()) out.push({ key: t.key, title: t.title, content: t.text.trim() });
      continue;
    }
    const d = draft.find((x) => x.key === t.key);
    if (d)
      out.push({
        key: d.key,
        // A title the school left at Rumi's English default follows the draft's language.
        title: t.title && t.title !== builtInTitle(t.key) ? t.title : d.title,
        content: t.text.trim() ? `${d.content}\n\n${t.text.trim()}` : d.content,
      });
  }
  const mentioned = new Set(template.map((t) => t.key));
  return [...out, ...draft.filter((d) => !mentioned.has(d.key))];
}
