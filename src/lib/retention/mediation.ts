import { createTranslator, type Translator } from "@/lib/i18n/core";
import { en } from "@/lib/i18n/messages/en";
import type { CheckinTag } from "./risk";

/**
 * Guided self-mediation (Phase 5). Pure: for each check-in tag, the agreement section it
 * maps to, what that section says (if the room has one), one piece of advice and an
 * editable opener to send the roommates.
 */

export interface MediationPrompt {
  tag: CheckinTag;
  title: string;
  /** Agreement section key (lib/agreements/template.ts). */
  sectionKey: string;
  /** The room's own words for that section, when there is an agreement. */
  agreementText: string | null;
  advice: string;
  suggestedMessage: string;
}

/** Which agreement section each tag is about. The words live in the retention dictionary. */
const SECTION: Record<CheckinTag, string> = {
  noise: "noise",
  cleanliness: "cleaning",
  guests: "guests",
  schedule: "sleep",
  communication: "conflict",
  other: "talk",
};

const EN = createTranslator("en", en, en, "retention");

export function getGuidedMediationTips(
  tags: string[],
  sections: Record<string, string> = {},
  t: Translator<"retention"> = EN,
): MediationPrompt[] {
  const known = [...new Set(tags)].filter((tag): tag is CheckinTag => tag in SECTION);
  const list = known.length ? known : (["communication"] as CheckinTag[]);
  return list.map((tag) => ({
    tag,
    title: t(`mediation.tips.${tag}.title`),
    sectionKey: SECTION[tag],
    agreementText: sections[SECTION[tag]] ?? null,
    advice: t(`mediation.tips.${tag}.advice`),
    suggestedMessage: t(`mediation.tips.${tag}.message`),
  }));
}
