/**
 * The default roommate agreement, prefilled from the members' profiles. Pure:
 * the server passes everyone's preferences and the pairwise watch-outs in.
 */

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

const QUIET_START = ["10pm", "10:30pm", "11pm", "midnight", "1am"];
const QUIET_START_WEEKEND = ["11pm", "11:30pm", "midnight", "1am", "2am"];
const OVERNIGHTS = [0, 1, 2, 3, 3];

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n))) - 1;

export function buildDraft(members: MemberPrefs[], watchouts: string[]): DraftSection[] {
  const earliest = Math.min(...members.map((m) => m.sleepSchedule));
  const tidiest = Math.max(...members.map((m) => m.cleanliness));
  const quietest = Math.min(...members.map((m) => m.noise));
  const fewestGuests = Math.min(...members.map((m) => m.guests));
  const anyoneNoSmoke = members.some((m) => m.smoking === "never");
  const anyoneNoDrink = members.some((m) => m.drinking === "never");
  const petOwners = members.filter((m) => m.pets === "have").map((m) => m.firstName);
  const anyoneNoPets = members.some((m) => m.pets === "none");
  const overnights = OVERNIGHTS[clamp(fewestGuests)];

  const sections: DraftSection[] = [
    {
      key: "sleep",
      title: "Sleep and quiet hours",
      content: `Quiet hours start at ${QUIET_START[clamp(earliest)]} on weeknights and ${QUIET_START_WEEKEND[clamp(earliest)]} on weekends. During quiet hours we use headphones and keep calls out of shared spaces.`,
    },
    {
      key: "cleaning",
      title: "Cleaning and chores",
      content:
        tidiest >= 4
          ? "Shared spaces get a quick tidy every day and dishes are washed the same day. We rotate bathroom, kitchen and trash weekly."
          : "Dishes are washed within a day. We rotate bathroom, kitchen and trash weekly.",
    },
    {
      key: "guests",
      title: "Guests and overnights",
      content:
        overnights === 0
          ? "We text a heads-up before having guests over. No overnight guests without asking first each time."
          : `We text a heads-up before having guests over. Overnight guests at most ${overnights} ${overnights === 1 ? "night" : "nights"} a week, and never during the other person's exams.`,
    },
    {
      key: "noise",
      title: "Noise",
      content:
        quietest <= 2
          ? "We keep music and TV low in shared spaces and use headphones for games and calls."
          : "Music and TV at a normal volume in shared spaces; headphones after quiet hours.",
    },
    {
      key: "shared",
      title: "Shared items and food",
      content:
        "Groceries are separate unless we agree otherwise. Shared basics (soap, toilet paper, paper towels) are split evenly and bought in turns. Ask before borrowing.",
    },
    {
      key: "substances",
      title: "Smoking, drinking and pets",
      content: [
        anyoneNoSmoke ? "No smoking or vaping inside." : "Smoking only outside, away from windows.",
        anyoneNoDrink
          ? "Drinking at home is low-key, and we ask before having friends over to drink."
          : "Drinking at home is fine in moderation; we ask before hosting.",
        petOwners.length && anyoneNoPets
          ? `${petOwners.join(" and ")}'s pet stays out of others' rooms, and the owner handles all care.`
          : petOwners.length
            ? "Pet owners handle care and clean-up for their own pets."
            : "No new pets unless everyone agrees first.",
      ].join(" "),
    },
    {
      key: "study",
      title: "Study time",
      content: `During exam weeks the place stays quiet from ${QUIET_START[Math.max(0, clamp(earliest) - 1)]}. We let each other know about big deadlines.`,
    },
    {
      key: "temperature",
      title: "Temperature",
      content:
        "The thermostat stays between 72 and 78°F unless we all agree otherwise. Windows closed when the AC is on.",
    },
    {
      key: "conflict",
      title: "When something bugs us",
      content:
        "We bring it up within a few days, in person and calmly. If we can't sort it out together, we ask our RA for help.",
    },
  ];

  if (watchouts.length > 0) {
    sections.push({
      key: "talk",
      title: "Talk about this",
      content: `Our matches flagged these differences. We've talked them through:\n${[...new Set(watchouts)].map((w) => `• ${w}`).join("\n")}`,
    });
  }
  return sections;
}
