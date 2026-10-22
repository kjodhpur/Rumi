/**
 * Every preference option in one place — the onboarding UI, profile display,
 * filters, validation and the matching engine's sentences all read from here.
 */

export const CLASS_YEARS = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "grad", label: "Grad student" },
] as const;
export type ClassYear = (typeof CLASS_YEARS)[number]["value"];

export const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "other", label: "Another identity" },
  { value: "undisclosed", label: "Prefer not to say" },
] as const;
export type Gender = (typeof GENDERS)[number]["value"];

/** Genders someone can say they're open to living with. */
export const ROOMMATE_GENDERS = [
  { value: "woman", label: "Women" },
  { value: "man", label: "Men" },
  { value: "nonbinary", label: "Non-binary people" },
  { value: "other", label: "Another identity" },
] as const;
export type RoommateGender = (typeof ROOMMATE_GENDERS)[number]["value"];

export const LEASE_LENGTHS = [
  { value: "semester", label: "One semester" },
  { value: "academic_year", label: "Academic year" },
  { value: "twelve_months", label: "12 months" },
  { value: "flexible", label: "Flexible" },
] as const;
export type LeaseLength = (typeof LEASE_LENGTHS)[number]["value"];

export const HOUSING_TYPES = [
  { value: "off_campus", label: "Off campus" },
  { value: "on_campus", label: "On campus" },
  { value: "either", label: "Either works" },
] as const;
export type HousingType = (typeof HOUSING_TYPES)[number]["value"];

export const SMOKING = [
  { value: "never", label: "Don't smoke" },
  { value: "sometimes", label: "Sometimes" },
  { value: "regularly", label: "Regularly" },
] as const;
export type Smoking = (typeof SMOKING)[number]["value"];

export const DRINKING = [
  { value: "never", label: "Don't drink" },
  { value: "socially", label: "Socially" },
  { value: "often", label: "Often" },
] as const;
export type Drinking = (typeof DRINKING)[number]["value"];

export const PETS = [
  { value: "none", label: "No pets" },
  { value: "have", label: "I have a pet" },
  { value: "want", label: "Want to get one" },
] as const;
export type Pets = (typeof PETS)[number]["value"];

export const STUDY = [
  { value: "campus", label: "Mostly on campus", hint: "Library, studios, labs" },
  { value: "home_quiet", label: "At home, quietly", hint: "I need the place calm" },
  { value: "home_social", label: "At home, with noise", hint: "Music or TV is fine" },
  { value: "mix", label: "A bit of both", hint: "Depends on the week" },
] as const;
export type Study = (typeof STUDY)[number]["value"];

/** 1–5 lifestyle scales with a short description per step. */
export const SCALES = {
  sleep_schedule: {
    label: "Sleep schedule",
    min: "Early bird",
    max: "Night owl",
    steps: [
      "Asleep by 10, up with the sun",
      "In bed around 11",
      "Midnight-ish, depends on the day",
      "Usually up past 1",
      "Night owl — 2am is early",
    ],
  },
  cleanliness: {
    label: "Cleanliness",
    min: "Relaxed",
    max: "Spotless",
    steps: [
      "Mess doesn't bother me",
      "Tidy-ish, deep clean now and then",
      "Clean common areas, chill about my room",
      "Dishes done daily, things put away",
      "Everything has a place, always",
    ],
  },
  noise: {
    label: "Noise at home",
    min: "Library quiet",
    max: "Always music on",
    steps: [
      "I need it quiet most of the time",
      "Quiet weeknights, a little noise is fine",
      "Normal background noise",
      "Music and TV usually on",
      "Loud is the vibe",
    ],
  },
  guests: {
    label: "Guests",
    min: "Rarely",
    max: "Often",
    steps: [
      "Hardly ever have people over",
      "A friend now and then",
      "A few times a month",
      "Most weekends",
      "Friends over constantly, overnight guests too",
    ],
  },
} as const;
export type ScaleKey = keyof typeof SCALES;

export const FACTORS = [
  "budget",
  "areas",
  "move_in",
  "lease",
  "housing_type",
  "sleep",
  "cleanliness",
  "noise",
  "guests",
  "smoking",
  "drinking",
  "pets",
  "study",
  "music",
] as const;
export type FactorKey = (typeof FACTORS)[number];

export const FACTOR_LABELS: Record<FactorKey, string> = {
  budget: "Budget",
  areas: "Neighborhoods",
  move_in: "Move-in date",
  lease: "Lease length",
  housing_type: "On or off campus",
  sleep: "Sleep schedule",
  cleanliness: "Cleanliness",
  noise: "Noise",
  guests: "Guests",
  smoking: "Smoking",
  drinking: "Drinking",
  pets: "Pets",
  study: "Study habits",
  music: "Music taste",
};

/** Importance levels for each factor. Index = stored value. */
export const IMPORTANCE = [
  { value: 0, label: "Doesn't matter", short: "Skip" },
  { value: 1, label: "Nice to have", short: "Nice" },
  { value: 2, label: "Important", short: "Important" },
  { value: 3, label: "Must match", short: "Must" },
] as const;
export type Importance = 0 | 1 | 2 | 3;

export const DEFAULT_IMPORTANCE: Record<FactorKey, Importance> = {
  budget: 2,
  areas: 2,
  move_in: 1,
  lease: 1,
  housing_type: 1,
  sleep: 2,
  cleanliness: 2,
  noise: 1,
  guests: 1,
  smoking: 2,
  drinking: 1,
  pets: 1,
  study: 1,
  music: 1,
};

/** Factors shown on the priorities step (music only appears once Spotify is connected). */
export const WEIGHTED_FACTORS: FactorKey[] = [
  "budget",
  "areas",
  "move_in",
  "sleep",
  "cleanliness",
  "noise",
  "guests",
  "smoking",
  "drinking",
  "pets",
  "study",
  "lease",
  "housing_type",
  "music",
];

export const DEALBREAKERS = [
  { value: "budget", label: "Budgets must overlap" },
  { value: "area", label: "We share a neighborhood" },
  { value: "smoking", label: "No smokers" },
  { value: "pets", label: "No pets" },
  { value: "drinking", label: "No frequent drinkers" },
  { value: "guests", label: "No frequent overnight guests" },
  { value: "sleep", label: "Similar sleep schedule" },
  { value: "cleanliness", label: "At least as tidy as me" },
  { value: "noise", label: "A quiet home" },
  { value: "move_in", label: "Move-in within 30 days" },
  { value: "housing_type", label: "Same on/off-campus plan" },
] as const;
export type Dealbreaker = (typeof DEALBREAKERS)[number]["value"];

export function labelOf<T extends { value: string; label: string }>(
  list: readonly T[],
  value: string | null | undefined,
): string {
  return list.find((item) => item.value === value)?.label ?? "";
}
