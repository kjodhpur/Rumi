import type { FactorKey } from "@/lib/options";
import { en, type Messages } from "@/lib/i18n/messages/en";

/**
 * Conversation starters (4.1): each watch-out between two students becomes a few
 * ready-to-send, editable openers. Template-based and direction-aware, never AI.
 */

export interface StarterPrefs {
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  smoking: string;
  drinking: string;
  pets: string;
  housingType: string;
}

export interface StarterGroup {
  key: FactorKey;
  lines: string[];
}

const higher = (mine: number, theirs: number) => theirs > mine;

type Lines = Messages["starters"];

export function startersFor(
  key: FactorKey,
  me: StarterPrefs,
  them: StarterPrefs,
  s: Lines = en.starters,
): string[] {
  switch (key) {
    case "sleep":
      return higher(me.sleepSchedule, them.sleepSchedule)
        ? [s.sleep.theyLater1, s.sleep.theyLater2]
        : [s.sleep.iLater1, s.sleep.iLater2];
    case "cleanliness":
      return higher(me.cleanliness, them.cleanliness)
        ? [s.cleanliness.theyTidier1, s.cleanliness.theyTidier2]
        : [s.cleanliness.iTidier1, s.cleanliness.iTidier2];
    case "noise":
      return higher(me.noise, them.noise)
        ? [s.noise.theyLouder1, s.noise.theyLouder2]
        : [s.noise.iLouder1, s.noise.iLouder2];
    case "guests":
      return higher(me.guests, them.guests)
        ? [s.guests.theyMore1, s.guests.theyMore2]
        : [s.guests.iMore1, s.guests.iMore2];
    case "smoking":
      return them.smoking === "never"
        ? [s.smoking.theyDont1, s.smoking.theyDont2]
        : [s.smoking.theyDo1, s.smoking.theyDo2];
    case "drinking":
      return [s.drinking.a, s.drinking.b];
    case "pets":
      return them.pets === "none"
        ? [s.pets.theyNone1, s.pets.theyNone2]
        : [s.pets.theyHave1, s.pets.theyHave2];
    case "study":
      return [s.study.a, s.study.b];
    case "budget":
      return [s.budget.a, s.budget.b];
    case "areas":
      return [s.areas.a, s.areas.b];
    case "move_in":
      return [s.move_in.a, s.move_in.b];
    case "lease":
      return [s.lease.a, s.lease.b];
    case "housing_type":
      return them.housingType === "on_campus"
        ? [s.housing_type.theyOn1, s.housing_type.theyOn2]
        : [s.housing_type.theyOff1, s.housing_type.theyOff2];
    case "music":
      return [s.music.a, s.music.b];
    case "classes":
      return [s.classes.a, s.classes.b];
  }
}

/** Starters for a chat: up to three watch-outs, two openers each. */
export function conversationStarters(
  watchouts: FactorKey[],
  me: StarterPrefs,
  them: StarterPrefs,
  s: Lines = en.starters,
): StarterGroup[] {
  return [...new Set(watchouts)]
    .slice(0, 3)
    .map((key) => ({ key, lines: startersFor(key, me, them, s).slice(0, 2) }));
}
