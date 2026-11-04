import type { Translator } from "./core";
import { room as enRoom } from "./messages/en/room";
import { room as esRoom } from "./messages/es/room";

type ChoreKey = keyof typeof enRoom.defaults;

const KEYS = Object.keys(enRoom.defaults) as ChoreKey[];

/** A suggested chore still under its default name reads in the viewer's language. */
export function choreTitle(stored: string, t: Translator<"room">) {
  const key = KEYS.find((k) => stored === enRoom.defaults[k] || stored === esRoom.defaults[k]);
  return key ? t(`defaults.${key}`) : stored;
}
