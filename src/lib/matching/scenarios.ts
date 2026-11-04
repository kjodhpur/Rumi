import type { ScenarioAnswer, ScenarioFactor } from "./types";

/**
 * Scenario questions (Phase 1.F): everyday situations whose answers sit on a factor's 1–5
 * scale. Answers both students gave refine that factor's similarity (see engine), and a
 * shared answer becomes a "why you match" line. Pure.
 *
 * Questions are versioned: changing a question's wording or choices means a new version,
 * and answers to the old version stop counting until the student answers again.
 */

export interface QuestionChoice {
  key: string;
  label: string;
  /** Position on the factor's 1–5 scale. */
  value: number;
  /** Shown in "why you match" when both students picked this answer. */
  reason: string;
}

export interface Question {
  key: string;
  version: number;
  kind: "scenario" | "scale" | "choice";
  factor: ScenarioFactor;
  stem: string;
  /** Short topic for a watch-out ("overnight guests"). */
  topic: string;
  choices: QuestionChoice[];
  /** Set for school-added questions. */
  schoolId?: string;
}

/** At most this many scenario questions per term. */
export const MAX_SCENARIOS = 8;

/** Rumi's default set. Scales: sleep 1 early … 5 late; cleanliness 1 relaxed … 5 spotless;
 * noise 1 quiet … 5 lively; guests 1 rarely … 5 often; study 1 silent … 5 social. */
export const DEFAULT_SCENARIOS: Question[] = [
  {
    key: "partner_overnight",
    version: 1,
    kind: "scenario",
    factor: "guests",
    topic: "overnight guests",
    stem: "Your roommate's partner stays over three nights a week.",
    choices: [
      {
        key: "fine",
        label: "Totally fine with me",
        value: 5,
        reason: "You're both relaxed about overnight guests",
      },
      {
        key: "talk_first",
        label: "Fine if we talk about it first",
        value: 3,
        reason: "You'd both want to talk about overnight guests first",
      },
      {
        key: "too_often",
        label: "Okay sometimes, but three nights is a lot",
        value: 2,
        reason: "You both think a few nights a week is too many",
      },
      {
        key: "not_okay",
        label: "Not okay for me",
        value: 1,
        reason: "Neither of you wants regular overnight guests",
      },
    ],
  },
  {
    key: "dishes",
    version: 1,
    kind: "scenario",
    factor: "cleanliness",
    topic: "dishes in the sink",
    stem: "Dishes are left in the sink overnight.",
    choices: [
      {
        key: "no_big_deal",
        label: "No big deal, they'll get done",
        value: 1,
        reason: "Neither of you minds dishes waiting a day",
      },
      {
        key: "next_day",
        label: "Fine if they're done the next day",
        value: 3,
        reason: "You both want dishes done within a day",
      },
      {
        key: "mention",
        label: "I'd mention it in the morning",
        value: 4,
        reason: "You'd both bring up dishes left out",
      },
      {
        key: "before_bed",
        label: "Dishes get done before bed",
        value: 5,
        reason: "You both want the sink empty by bedtime",
      },
    ],
  },
  {
    key: "thursday_night",
    version: 1,
    kind: "scenario",
    factor: "noise",
    topic: "weeknight noise",
    stem: "It's 11pm on a Thursday and your roommate has friends over, laughing loudly.",
    choices: [
      {
        key: "join",
        label: "I'd probably join in",
        value: 5,
        reason: "You both like a lively place, even on weeknights",
      },
      {
        key: "wrap_up",
        label: "Fine if it wraps up by midnight",
        value: 3,
        reason: "You'd both want weeknight noise to wind down by midnight",
      },
      {
        key: "headphones",
        label: "Headphones on, but I'd mention it",
        value: 2,
        reason: "You'd both rather keep weeknights calm",
      },
      {
        key: "quiet",
        label: "Weeknights should be quiet",
        value: 1,
        reason: "You both want quiet weeknights",
      },
    ],
  },
  {
    key: "finals_group",
    version: 1,
    kind: "scenario",
    factor: "study",
    topic: "studying in the room",
    stem: "During finals, your roommate wants a study group in your room.",
    choices: [
      {
        key: "love_it",
        label: "Great, I'll join",
        value: 5,
        reason: "You both like studying with people around",
      },
      {
        key: "heads_up",
        label: "Fine with a heads-up",
        value: 3,
        reason: "You'd both want a heads-up before a study group",
      },
      {
        key: "library",
        label: "I'd head to the library",
        value: 2,
        reason: "You'd both move a study group somewhere else",
      },
      {
        key: "keep_quiet",
        label: "The room should stay quiet during finals",
        value: 1,
        reason: "You both want a quiet room during finals",
      },
    ],
  },
  {
    key: "bathroom",
    version: 1,
    kind: "scenario",
    factor: "cleanliness",
    topic: "cleaning the bathroom",
    stem: "The shared bathroom is getting messy by midweek.",
    choices: [
      {
        key: "dont_notice",
        label: "I honestly wouldn't notice",
        value: 1,
        reason: "Neither of you sweats a messy bathroom",
      },
      {
        key: "weekend",
        label: "We clean it on the weekend",
        value: 3,
        reason: "You'd both clean the bathroom weekly",
      },
      {
        key: "every_few_days",
        label: "A quick wipe every few days",
        value: 4,
        reason: "You both like a quick clean every few days",
      },
      {
        key: "right_away",
        label: "It gets cleaned right away",
        value: 5,
        reason: "You both keep the bathroom spotless",
      },
    ],
  },
  {
    key: "early_alarm",
    version: 1,
    kind: "scenario",
    factor: "sleep",
    topic: "early alarms",
    stem: "Your roommate's alarm goes off at 6:30am on weekdays.",
    choices: [
      {
        key: "already_up",
        label: "I'm probably already up",
        value: 1,
        reason: "You're both early risers",
      },
      {
        key: "fine_weekdays",
        label: "Fine on weekdays",
        value: 2,
        reason: "You're both fine with early weekday alarms",
      },
      {
        key: "no_snooze",
        label: "Okay, as long as there's no snoozing",
        value: 4,
        reason: "You'd both want early alarms off fast",
      },
      {
        key: "bothers_me",
        label: "That would really bother me",
        value: 5,
        reason: "Neither of you wants early alarms",
      },
    ],
  },
  {
    key: "late_lamp",
    version: 1,
    kind: "scenario",
    factor: "sleep",
    topic: "late nights with the lights on",
    stem: "It's 1am and your roommate is still up with the lamp on.",
    choices: [
      { key: "me_too", label: "I'm still up too", value: 5, reason: "You're both up late" },
      {
        key: "dim",
        label: "Fine if it's dim",
        value: 3,
        reason: "You're both fine with a dim light late",
      },
      {
        key: "dark_by_midnight",
        label: "I need it dark by midnight",
        value: 1,
        reason: "You both want lights out by midnight",
      },
    ],
  },
  {
    key: "weekend_visitor",
    version: 1,
    kind: "scenario",
    factor: "guests",
    topic: "weekend visitors",
    stem: "A friend from home wants to sleep on the floor for the weekend.",
    choices: [
      {
        key: "of_course",
        label: "Of course",
        value: 5,
        reason: "You're both happy to host friends",
      },
      {
        key: "heads_up",
        label: "Sure, with a heads-up",
        value: 3,
        reason: "You'd both want a heads-up before visitors stay",
      },
      {
        key: "rarely",
        label: "Only once in a while",
        value: 2,
        reason: "You both keep visitors occasional",
      },
      {
        key: "rather_not",
        label: "I'd rather not",
        value: 1,
        reason: "Neither of you wants visitors staying over",
      },
    ],
  },
];

/** The questions a student answers: the school's live ones first, then Rumi's defaults. */
export function activeQuestions(schoolQuestions: Question[]): Question[] {
  const scenarios = schoolQuestions.filter((q) => q.kind === "scenario");
  const others = schoolQuestions.filter((q) => q.kind !== "scenario");
  const taken = new Set(scenarios.map((q) => q.key));
  const defaults = DEFAULT_SCENARIOS.filter((q) => !taken.has(q.key));
  return [...scenarios, ...defaults].slice(0, MAX_SCENARIOS).concat(others);
}

/** A stored answer to the engine's form, skipping answers to old versions or unknown choices. */
export function toScenarioAnswers(
  answers: { question_key: string; question_version: number; choice_key: string }[],
  questions: Question[],
): Record<string, ScenarioAnswer> {
  const byKey = new Map(questions.map((q) => [q.key, q]));
  const out: Record<string, ScenarioAnswer> = {};
  for (const a of answers) {
    const q = byKey.get(a.question_key);
    if (!q || q.version !== a.question_version) continue;
    const choice = q.choices.find((c) => c.key === a.choice_key);
    if (!choice) continue;
    out[`${q.key}@${q.version}`] = {
      factor: q.factor,
      value: choice.value,
      reason: choice.reason,
      topic: q.topic,
      builtIn: !q.schoolId,
      questionKey: q.key,
      choiceKey: choice.key,
    };
  }
  return out;
}

/** Validates a school-entered question's choices (keys unique, values 1–5). */
export function validChoices(choices: QuestionChoice[]): boolean {
  const keys = new Set(choices.map((c) => c.key));
  return (
    choices.length >= 2 &&
    choices.length <= 5 &&
    keys.size === choices.length &&
    choices.every(
      (c) =>
        /^[a-z0-9_]{1,40}$/.test(c.key) &&
        Number.isInteger(c.value) &&
        c.value >= 1 &&
        c.value <= 5 &&
        c.label.trim().length > 0,
    )
  );
}
