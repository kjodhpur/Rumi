import type { Translator } from "./core";
import { checkins as enCheckins } from "./messages/en/checkins";

type ReasonKey = keyof typeof enCheckins.riskReasons;
type DefaultKey = keyof typeof enCheckins.reasonDefaults;

const RISK_KEYS = Object.keys(enCheckins.riskReasons) as ReasonKey[];

/** Risk reasons are stored in English (staff read them too); students read them in theirs. */
export function riskReason(stored: string, t: Translator<"checkins">) {
  const key = RISK_KEYS.find((k) => enCheckins.riskReasons[k] === stored);
  return key ? t(`riskReasons.${key}`) : stored;
}

/** A room-change reason the school left at its default name reads in the student's language. */
export function reasonLabel(key: string, label: string, t: Translator<"checkins">) {
  if (!(key in enCheckins.reasonDefaults)) return label;
  const k = key as DefaultKey;
  return label === enCheckins.reasonDefaults[k] ? t(`reasonDefaults.${k}`) : label;
}
