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

export interface MatchProfile {
  id: string;
  firstName: string;
  gender: Gender | null;
  prefs: MatchPreferences;
  /** Null when Spotify isn't connected — the music factor is then skipped entirely. */
  music: MatchMusic | null;
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
  | { kind: "dealbreaker"; who: "a" | "b"; dealbreaker: Dealbreaker };
