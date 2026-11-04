import type { Translator } from "./core";
import { agreement as enAgreement } from "./messages/en/agreement";
import { agreement as esAgreement } from "./messages/es/agreement";

type SectionKey = keyof typeof enAgreement.sections;

const isSectionKey = (key: string): key is SectionKey => key in enAgreement.sections;

/**
 * A built-in section keeps the title it was drafted with. Shown to someone reading in another
 * language, a title still at Rumi's default (in any language) is shown in theirs; a title the
 * school or the group wrote stays as written.
 */
export function sectionTitle(key: string, stored: string, t: Translator<"agreement">) {
  if (!isSectionKey(key)) return stored;
  const defaults = [enAgreement.sections[key], esAgreement.sections[key]];
  return defaults.includes(stored) ? t(`sections.${key}`) : stored;
}
