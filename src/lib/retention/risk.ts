/** Transparent check-in risk. Rules only — no model. Highest matching rule wins. */

import { checkins } from "@/lib/i18n/messages/en/checkins";

export const CHECKIN_TAGS = [
  "noise",
  "guests",
  "cleanliness",
  "schedule",
  "communication",
  "other",
] as const;
export type CheckinTag = (typeof CHECKIN_TAGS)[number];

export type RiskLevel = "low" | "medium" | "high";

export interface CheckinPoint {
  score: number;
  tags: string[];
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
/** Stored in English for staff; students read them translated (lib/i18n/checkins.ts). */
const R = checkins.riskReasons;

/** Oldest check-in first. Roommate scores are each roommate's latest score. */
export function assessRisk(input: {
  checkins: CheckinPoint[];
  roommateScores?: number[];
  watchouts?: string[];
  missed?: boolean;
}): RiskAssessment {
  const hits: { level: RiskLevel; text: string }[] = [];
  const latest = input.checkins.at(-1);
  const previous = input.checkins.at(-2);

  if (latest && previous) {
    if (latest.score <= 2 && previous.score <= 2) {
      hits.push({ level: "high", text: R.twoLow });
    }
    const drop = previous.score - latest.score;
    if (drop >= 3 || (drop >= 2 && latest.score <= 2)) {
      hits.push({ level: "high", text: R.sharpDrop });
    } else if (drop >= 2) {
      hits.push({ level: "medium", text: R.drop });
    }
  }

  if (latest) {
    for (const other of input.roommateScores ?? []) {
      const gap = Math.abs(latest.score - other);
      if (gap >= 3 || (Math.min(latest.score, other) <= 2 && Math.max(latest.score, other) >= 4)) {
        hits.push({ level: "high", text: R.veryDifferent });
        break;
      }
      if (gap >= 2) {
        hits.push({ level: "medium", text: R.different });
        break;
      }
    }
    const watch = new Set(input.watchouts ?? []);
    if (latest.tags.some((tag) => watch.has(tag))) {
      hits.push({
        level: "medium",
        text: R.knownTag,
      });
    }
  }

  if (input.missed) hits.push({ level: "medium", text: R.missed });

  const level = hits.reduce<RiskLevel>(
    (best, hit) => (RANK[hit.level] > RANK[best] ? hit.level : best),
    "low",
  );
  return { level, reasons: hits.map((hit) => hit.text) };
}

/** Crisis language in a private note. Shows 988 to the student; never auto-shared with staff. */
const CRISIS =
  /\b(suicid\w*|kill myself|self[- ]harm\w*|end my life|want to die|hurt myself|cutting myself|no reason to live)\b/i;

/** Threat language (toward someone else). Shows 911 / campus police to the student. */
const THREAT =
  /\b(kill (him|her|them|you)|hurt (him|her|them|you)|beat (him|her|them|you) up|bring a (gun|knife)|threaten(ed|ing)? me|he hit me|she hit me|they hit me|afraid for my safety|not safe in my room)\b/i;

/** The same signals in Spanish, for students who write their notes in it. */
const CRISIS_ES =
  /(?<![\p{L}])(suicid\p{L}*|quiero matarme|me quiero matar|quitarme la vida|acabar con mi vida|autolesi\p{L}*|hacerme daño|lastimarme|cortarme|quiero morirme|me quiero morir|no quiero (seguir )?vivir|no tengo (razones|motivos) para vivir)(?![\p{L}])/iu;
const THREAT_ES =
  /(?<![\p{L}])(matarl[oae]s?|lastimarl[oae]s?|hacerle daño|golpearl[oae]s?|traer un (arma|cuchillo|pistola)|me amenaz\p{L}*|me peg[oó]|me golpe[oó]|temo por mi seguridad|no estoy segur[oa] en mi cuarto|tengo miedo de (él|ella|ellos|ellas))(?![\p{L}])/iu;

export function crisisSignal(note: string) {
  return CRISIS.test(note) || CRISIS_ES.test(note);
}

export function threatSignal(note: string) {
  return THREAT.test(note) || THREAT_ES.test(note);
}
