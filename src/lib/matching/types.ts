import type {
  Dealbreaker,
  Drinking,
  FactorKey,
  Gender,
  HousingType,
  Importance,
  LeaseLength,
  Pets,
  RoommateGender,
  Smoking,
  Study,
} from "@/lib/options";

export interface MatchPreferences {
  budgetMin: number;
  budgetMax: number;
  areas: string[];
  /** ISO date (yyyy-mm-dd) or null when unknown. */
  moveInDate: string | null;
  leaseLength: LeaseLength;
  housingType: HousingType;
  /** Genders this person is open to living with. Empty means anyone. */
  genderPref: RoommateGender[];
  sleepSchedule: number;
  cleanliness: number;
  noise: number;
  guests: number;
  smoking: Smoking;
  drinking: Drinking;
  pets: Pets;
  study: Study;
  dealbreakers: Dealbreaker[];
  /** Importance 0–3 per factor; missing keys fall back to defaults. */
  weights: Partial<Record<FactorKey, Importance>>;
}

export interface MatchMusic {
  artists: { id: string; name: string }[];
  genres: string[];
}

export type AccommodationConstraintKey =
  | "esa_approved"
  | "single_bathroom"
  | "ground_floor"
  | "allergen_free"
  | "mobility_accessible";

export type SchoolRuleType =
  | "same_academic_college"
  | "same_residential_college"
  | "llc_exclusive"
  | "freshman_same_college";

export interface SchoolRule {
  type: SchoolRuleType;
  active: boolean;
  params?: Record<string, unknown>;
}

/** Factors a scenario or school question can inform (each on its 1–5 scale). */
export type ScenarioFactor = "sleep" | "cleanliness" | "noise" | "guests" | "study";

/** One answered scenario / school question, as a position on its factor's scale. */
export interface ScenarioAnswer {
  factor: ScenarioFactor;
  /** 1–5 on the factor's scale. */
  value: number;
  /** Short shared-ground text when both picked the same answer. */
  reason: string;
  /** Short topic for a watch-out ("overnight guests"). */
  topic: string;
}

export type Track = "freshman" | "returning" | "transfer" | "grad";

export interface MatchProfile {
  id: string;
  firstName: string;
  gender: Gender | null;
  prefs: MatchPreferences;
  /** Null when Spotify isn't connected — the music factor is then skipped entirely. */
  music: MatchMusic | null;
  /** Student track. Tracks are separate pools unless the school merges them. */
  track?: Track | null;
  /** Admitted, not yet enrolled: matched only inside the pre-arrival + incoming pool. */
  preArrival?: boolean;
  /** Admit term for pre-arrival students; pre-arrival pairs must share it. */
  admitTermId?: string | null;
  /** Approved accommodations (set by housing staff; never shown to other students). */
  accommodations?: AccommodationConstraintKey[];
  academicCollege?: string | null;
  residentialCollege?: string | null;
  llc?: string | null;
  /** Scenario / school question answers keyed by "<key>@<version>". */
  scenarios?: Record<string, ScenarioAnswer>;
  /** Earliest weekday class start and latest class end, minutes after midnight. */
  classDay?: { earliestStart: number; latestEnd: number } | null;
}

export interface Reason {
  key: FactorKey;
  label: string;
}

export interface FactorScore {
  key: FactorKey;
  label: string;
  /** 0–1 similarity on this factor. */
  similarity: number;
  /** The viewer's importance (0–3) for this factor. */
  importance: Importance;
}

export interface DirectionalResult {
  reasons: Reason[];
  watchouts: Reason[];
  breakdown: FactorScore[];
  /** How satisfied this person would be (0–1) given their own priorities. */
  satisfaction: number;
}

export interface MatchEvaluation {
  /** Symmetric 0–100 compatibility. */
  score: number;
  /** Explanations written from A's point of view. */
  forA: DirectionalResult;
  /** Explanations written from B's point of view. */
  forB: DirectionalResult;
  sharedArtists: { id: string; name: string }[];
}

export type HardFilterFailure =
  | { kind: "gender"; who: "a" | "b" }
  | { kind: "dealbreaker"; who: "a" | "b"; dealbreaker: Dealbreaker }
  | { kind: "pre_arrival_pool"; who: "a" | "b" }
  | { kind: "track_pool"; who: "a" | "b" }
  | { kind: "accommodation"; who: "a" | "b"; constraintKey: AccommodationConstraintKey }
  | { kind: "school_rule"; who: "a" | "b"; ruleType: SchoolRuleType };
