import type {
  CAMPUSES,
  DRINKING,
  GENDER_PREF,
  IMPORTANCE,
  LEASE_LENGTHS,
  LOOKING_FOR,
  LIFESTYLE_SCALE_KEYS,
  MOVE_IN_TERMS,
  OWN_GENDER,
  PETS,
  PLACE_STATUS,
  PREFERRED_AREAS,
  ROOMMATE_COUNTS,
  SMOKING,
  YEARS,
} from "./constants";

export type Campus = (typeof CAMPUSES)[number];
export type Year = (typeof YEARS)[number];
export type LookingFor = (typeof LOOKING_FOR)[number];
export type PreferredArea = (typeof PREFERRED_AREAS)[number];
export type MoveInTerm = (typeof MOVE_IN_TERMS)[number];
export type LeaseLength = (typeof LEASE_LENGTHS)[number];
export type RoommateCount = (typeof ROOMMATE_COUNTS)[number];
export type PlaceStatus = (typeof PLACE_STATUS)[number];
export type Smoking = (typeof SMOKING)[number];
export type Drinking = (typeof DRINKING)[number];
export type Pets = (typeof PETS)[number];
export type GenderPref = (typeof GENDER_PREF)[number];
export type OwnGender = (typeof OWN_GENDER)[number];
export type Importance = (typeof IMPORTANCE)[number];
export type LifestyleScaleKey = (typeof LIFESTYLE_SCALE_KEYS)[number];

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_initial: string;
  photo_url: string | null;
  pronouns: string | null;
  year: Year;
  major: string;
  campus: Campus;
  bio: string;
  instagram: string | null;
  own_gender: OwnGender;
  show_gender_publicly: boolean;
  onboarding_complete: boolean;
  onboarding_step: number;
  paused: boolean;
  suspended: boolean;
  is_seed: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface HousingPrefs {
  user_id: string;
  looking_for: LookingFor;
  budget_min: number;
  budget_max: number;
  preferred_areas: PreferredArea[];
  move_in_term: MoveInTerm;
  lease_length: LeaseLength;
  roommates_wanted: RoommateCount;
  place_status: PlaceStatus;
}

export type LifestyleScales = Record<LifestyleScaleKey, number>;

export interface LifestylePrefs extends LifestyleScales {
  user_id: string;
  smoking: Smoking;
  drinking: Drinking;
  pets: Pets;
  gender_preference: GenderPref;
  dealbreakers: string[];
  weights: Record<string, Importance>;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  image_url: string | null;
  rank: number;
}

export interface SpotifyGenre {
  genre: string;
  count: number;
}

export interface MatchCandidate {
  profile: Profile;
  housing: HousingPrefs;
  lifestyle: LifestylePrefs;
  spotifyConnected: boolean;
  topArtists: SpotifyArtist[];
  genres: SpotifyGenre[];
}

export interface MatchBreakdown {
  lifestyleScore: number;
  musicScore: number | null;
  finalScore: number;
  campusBonus: number;
  yearBonus: number;
  inCommon: string[];
  frictionPoints: Array<{ category: string; gap: number; yours: number; theirs: number }>;
  sharedArtists: Array<{ id: string; name: string }>;
  sharedGenres: string[];
  categoryScores: Array<{ key: string; label: string; yours: number; theirs: number; similarity: number }>;
}

export interface MatchResult {
  otherId: string;
  score: number;
  breakdown: MatchBreakdown;
}
