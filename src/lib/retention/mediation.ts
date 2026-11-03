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

const DATA: Record<CheckinTag, Omit<MediationPrompt, "tag" | "agreementText">> = {
  noise: {
    title: "Noise",
    sectionKey: "noise",
    advice: "Talk about specific times (\"after 11 on weeknights\") rather than noise in general.",
    suggestedMessage: "Hey, got a few minutes today? I'd like to check we're still on the same page about noise on weeknights.",
  },
  cleanliness: {
    title: "Cleaning and chores",
    sectionKey: "cleaning",
    advice: "Point to the rotation, not the person. Offering to reset a space together takes the edge off.",
    suggestedMessage: "Could we spend ten minutes tonight resetting the kitchen together and look at the chore rotation again?",
  },
  guests: {
    title: "Guests and overnights",
    sectionKey: "guests",
    advice: "Agree on a heads-up habit, like a text a few hours before, so nobody's surprised.",
    suggestedMessage: "Can we agree to text each other a heads-up before someone stays over? It'd help me plan my mornings.",
  },
  schedule: {
    title: "Sleep and schedules",
    sectionKey: "sleep",
    advice: "Small changes help most: a desk lamp, headphones, a set lights-out time on weeknights.",
    suggestedMessage: "I've got early classes this term. Would headphones and a lamp after midnight on weeknights work for you?",
  },
  communication: {
    title: "Talking it through",
    sectionKey: "conflict",
    advice: "Bring it up early and in person. Ask how it's going for them before saying how it's going for you.",
    suggestedMessage: "Do you have ten minutes to sit down this week? I'd like to check in on how the room's feeling for both of us.",
  },
  other: {
    title: "Living together",
    sectionKey: "talk",
    advice: "Go back to your agreement together and pick the one thing that most needs a refresh.",
    suggestedMessage: "Could we take a few minutes to look at our roommate agreement again and see what needs updating?",
  },
};

export function getGuidedMediationTips(tags: string[], sections: Record<string, string> = {}): MediationPrompt[] {
  const known = [...new Set(tags)].filter((t): t is CheckinTag => t in DATA);
  const list = known.length ? known : (["communication"] as CheckinTag[]);
  return list.map((tag) => ({ tag, ...DATA[tag], agreementText: sections[DATA[tag].sectionKey] ?? null }));
}
