export interface ScenarioChoice {
  key: string;
  label: string;
  shortReason: string;
}

export interface ScenarioQuestion {
  id: string;
  factor: "guests" | "cleanliness" | "noise" | "study" | "sleep" | "communication";
  stem: string;
  choices: ScenarioChoice[];
}

export const DEFAULT_SCENARIOS: ScenarioQuestion[] = [
  {
    id: "scen_dishes",
    factor: "cleanliness",
    stem: "There are dishes in the sink left overnight. What is your reaction?",
    choices: [
      {
        key: "wash",
        label: "I usually just wash them myself, no big deal",
        shortReason: "Easygoing with shared dishes in the sink",
      },
      {
        key: "leave",
        label: "Leave them — they'll wash them when they have time",
        shortReason: "Patient with daily dish schedules",
      },
      {
        key: "remind",
        label: "Send a friendly text or mention it in person",
        shortReason: "Prefers clean sinks with friendly communication",
      },
      {
        key: "strict",
        label: "Clean dishes before bed every single night",
        shortReason: "Prefers zero dirty dishes left overnight",
      },
    ],
  },
  {
    id: "scen_partner_overnight",
    factor: "guests",
    stem: "Your roommate's partner stays over 3 nights a week:",
    choices: [
      {
        key: "fine",
        label: "Totally fine, no heads-up needed",
        shortReason: "Open and relaxed about frequent guests",
      },
      {
        key: "talk_first",
        label: "Fine, as long as we give a quick heads-up beforehand",
        shortReason: "Both prefer a quick heads-up before overnight guests",
      },
      {
        key: "rare",
        label: "Okay occasionally, but 3 nights is too frequent",
        shortReason: "Prefers limiting overnight stays to 1–2 nights",
      },
      {
        key: "no",
        label: "Room is strictly for roommates only",
        shortReason: "Prefers no overnight non-roommate guests",
      },
    ],
  },
  {
    id: "scen_thursday_hangout",
    factor: "noise",
    stem: "It's 10:00 PM on a Thursday and friends want to hang out in the room:",
    choices: [
      {
        key: "welcome",
        label: "The more the merrier! Bring them in",
        shortReason: "Enjoys spontaneous weeknight room hangouts",
      },
      {
        key: "heads_up",
        label: "Cool if you text first so I can prepare",
        shortReason: "Likes a text before weeknight visitors",
      },
      {
        key: "quiet",
        label: "Fine if we keep it quiet and wrap up around 11",
        shortReason: "Values quiet weeknight wind-down after 11 PM",
      },
      {
        key: "lounge",
        label: "Prefer taking gatherings to the dorm lounge on weeknights",
        shortReason: "Prefers common lounges for weeknight group hangouts",
      },
    ],
  },
  {
    id: "scen_study_exam",
    factor: "study",
    stem: "When you have a major exam tomorrow morning, how should the room be?",
    choices: [
      {
        key: "silent",
        label: "Pin-drop quiet with headphones only",
        shortReason: "Values complete silence for exam prep",
      },
      {
        key: "ambient",
        label: "Low background music or gentle conversation is fine",
        shortReason: "Comfortable with ambient background sound while studying",
      },
      {
        key: "library",
        label: "I usually go to the library or study lounge anyway",
        shortReason: "Flexible room space — studies in library for big exams",
      },
      {
        key: "group",
        label: "I like having a study group right in the room",
        shortReason: "Likes collaborative room study sessions",
      },
    ],
  },
  {
    id: "scen_borrowing",
    factor: "cleanliness",
    stem: "Borrowing shared items (appliances, food, supplies):",
    choices: [
      {
        key: "open",
        label: "Open sharing — just replace or restock what you use",
        shortReason: "Generous open sharing of room items",
      },
      {
        key: "ask",
        label: "Always ask first before taking or borrowing",
        shortReason: "Respects boundaries: asks before borrowing items",
      },
      {
        key: "kitchen_only",
        label: "Appliances shared; food and toiletries private",
        shortReason: "Shares kitchenware, keeps personal items private",
      },
      {
        key: "separate",
        label: "Everything strictly separate",
        shortReason: "Prefers completely separate supplies and groceries",
      },
    ],
  },
  {
    id: "scen_conflict",
    factor: "communication",
    stem: "Something your roommate did is bothering you. How do you address it?",
    choices: [
      {
        key: "direct",
        label: "Talk it out casually in person right away",
        shortReason: "Direct, face-to-face communication style",
      },
      {
        key: "text",
        label: "Send a light, kind text to keep things low pressure",
        shortReason: "Comfortable resolving quick questions over text",
      },
      {
        key: "wait",
        label: "Wait a day or two to see if it was just a one-off",
        shortReason: "Patient and gives roommates space before addressing issues",
      },
      {
        key: "agreement",
        label: "Check in during our weekly room sync or revisit our agreement",
        shortReason: "Uses agreement guidelines for calm resolution",
      },
    ],
  },
  {
    id: "scen_morning_alarm",
    factor: "sleep",
    stem: "Your morning alarm goes off:",
    choices: [
      {
        key: "instant",
        label: "I wake up and turn it off immediately",
        shortReason: "Quick wakers: turns alarms off on first ring",
      },
      {
        key: "one_snooze",
        label: "Snooze once, up within 10 minutes",
        shortReason: "Quick 10-minute wake-up routine",
      },
      {
        key: "multi_snooze",
        label: "Need 3–4 alarms to actually get out of bed",
        shortReason: "Heavy sleeper with multiple alarms",
      },
      {
        key: "silent",
        label: "Vibrating smartwatch alarm so I don't disturb the room",
        shortReason: "Quiet morning wake-up with silent smartwatch alarms",
      },
    ],
  },
  {
    id: "scen_room_temp",
    factor: "sleep",
    stem: "Ideal sleeping room temperature:",
    choices: [
      {
        key: "cool",
        label: "Cool (65°–67°F) with a warm duvet",
        shortReason: "Prefers a cool sleeping room (65°–67°F)",
      },
      {
        key: "moderate",
        label: "Comfortable room temp (68°–71°F)",
        shortReason: "Prefers standard room temp (68°–71°F)",
      },
      {
        key: "warm",
        label: "Warm (72°F+) — I get chilly easily",
        shortReason: "Prefers warmer sleeping environment",
      },
      {
        key: "flexible",
        label: "Flexible — whatever roommate is comfortable with",
        shortReason: "Adaptable room temperature preferences",
      },
    ],
  },
];

export interface ScenarioEvaluation {
  answeredCount: number;
  sharedAnsweredCount: number;
  agreementRate: number; // 0 to 1
  bonusScore: number; // 0 to 3 points
  reasons: string[];
  watchouts: string[];
}

/**
 * Compares two students' scenario answers to compute compatibility signals.
 */
export function evaluateScenarioMatch(
  answersA: Record<string, string>,
  answersB: Record<string, string>,
  scenarios: ScenarioQuestion[] = DEFAULT_SCENARIOS,
): ScenarioEvaluation {
  let sharedCount = 0;
  let matches = 0;
  const reasons: string[] = [];
  const watchouts: string[] = [];

  for (const s of scenarios) {
    const a = answersA[s.id];
    const b = answersB[s.id];

    if (!a || !b) continue;
    sharedCount += 1;

    const choiceA = s.choices.find((c) => c.key === a);
    const choiceB = s.choices.find((c) => c.key === b);

    if (a === b && choiceA) {
      matches += 1;
      // Add reason for strong alignment
      reasons.push(choiceA.shortReason);
    } else if (
      (s.id === "scen_partner_overnight" && ((a === "fine" && b === "no") || (a === "no" && b === "fine"))) ||
      (s.id === "scen_dishes" && ((a === "strict" && b === "leave") || (a === "leave" && b === "strict"))) ||
      (s.id === "scen_study_exam" && ((a === "silent" && b === "group") || (a === "group" && b === "silent")))
    ) {
      // Divergent watch-out
      watchouts.push(`Different expectations on ${s.factor}: discuss in roommate agreement.`);
    }
  }

  const agreementRate = sharedCount > 0 ? matches / sharedCount : 0;
  // Bounded bonus: up to +3 points for high agreement on scenarios
  const bonusScore = sharedCount >= 2 ? Math.round(agreementRate * 3) : 0;

  return {
    answeredCount: Object.keys(answersA).length,
    sharedAnsweredCount: sharedCount,
    agreementRate,
    bonusScore,
    reasons: reasons.slice(0, 2),
    watchouts: watchouts.slice(0, 1),
  };
}
