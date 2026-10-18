export const APP_NAME = "Rumi";
export const APP_TAGLINE = "Find your ASU roommate — free, ranked, no swiping.";
export const ASU_EMAIL_DOMAIN = "asu.edu";

export const CAMPUSES = [
  "Tempe",
  "Downtown Phoenix",
  "Polytechnic",
  "West Valley",
] as const;

export const YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Grad",
] as const;

export const LOOKING_FOR = ["on-campus", "off-campus", "either"] as const;

export const PREFERRED_AREAS = [
  "Tempe near campus",
  "Tempe south",
  "Mesa",
  "Downtown Phoenix",
  "Tooker House",
  "Vertex",
  "The Hyve",
  "Union Tempe",
  "Other",
] as const;

export const MOVE_IN_TERMS = [
  "Fall 2027",
  "Spring 2027",
  "Summer 2027",
  "ASAP",
] as const;

export const LEASE_LENGTHS = ["semester", "10-12 months", "flexible"] as const;

export const ROOMMATE_COUNTS = ["1", "2", "3+"] as const;

export const PLACE_STATUS = ["has-place", "needs-place"] as const;

export const SMOKING = ["no", "outside-only", "yes"] as const;
export const DRINKING = ["no", "socially", "often"] as const;
export const PETS = ["have-pet", "ok-with-pets", "no-pets"] as const;
export const GENDER_PREF = ["same-gender", "any", "no-preference"] as const;
export const OWN_GENDER = ["woman", "man", "non-binary", "prefer-not-to-say"] as const;

export const IMPORTANCE = ["not", "somewhat", "very"] as const;

export const IMPORTANCE_WEIGHT: Record<(typeof IMPORTANCE)[number], number> = {
  not: 0.5,
  somewhat: 1,
  very: 2,
};

export const LIFESTYLE_SCALE_KEYS = [
  "sleep_schedule",
  "cleanliness",
  "guests",
  "noise_tolerance",
  "social_level",
  "study_at_home",
  "cooking_sharing",
] as const;

export const LIFESTYLE_LABELS: Record<(typeof LIFESTYLE_SCALE_KEYS)[number], string> = {
  sleep_schedule: "Sleep schedule",
  cleanliness: "Cleanliness",
  guests: "Guests over",
  noise_tolerance: "Noise tolerance",
  social_level: "Social level at home",
  study_at_home: "Study at home",
  cooking_sharing: "Cooking / sharing food",
};

export const LIFESTYLE_SCALE_ENDS: Record<
  (typeof LIFESTYLE_SCALE_KEYS)[number],
  [string, string]
> = {
  sleep_schedule: ["Early bird", "Night owl"],
  cleanliness: ["Relaxed", "Spotless"],
  guests: ["Never", "Often"],
  noise_tolerance: ["Need quiet", "Loud is fine"],
  social_level: ["Keep to myself", "Best friend roommate"],
  study_at_home: ["Rarely", "Constantly"],
  cooking_sharing: ["Never share", "Share everything"],
};

export const REPORT_REASONS = [
  "fake-profile",
  "harassment",
  "spam",
  "other",
] as const;

export const BUDGET_MIN = 400;
export const BUDGET_MAX = 2000;
export const BIO_MAX = 300;
export const FIRST_MESSAGE_MIN_CHARS = 20;
export const MAX_NEW_CONVERSATIONS_PER_DAY = 20;

export const ONBOARDING_STEPS = [
  "basics",
  "housing",
  "lifestyle",
  "dealbreakers",
  "weights",
  "spotify",
] as const;
