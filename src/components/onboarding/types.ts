import type {
  ClassYear,
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
import type { PhotoRecord } from "@/app/actions/photos";

export interface ProfileDraft {
  firstName: string;
  lastName: string;
  pronouns: string;
  gender: Gender | "";
  classYear: ClassYear | "";
  major: string;
  bio: string;
}

export interface PrefsDraft {
  budgetMin: number;
  budgetMax: number;
  areas: string[];
  moveInDate: string;
  leaseLength: LeaseLength;
  housingType: HousingType;
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
  weights: Partial<Record<FactorKey, Importance>>;
}

export interface AreaOption {
  slug: string;
  name: string;
  description: string;
}

export interface OnboardingData {
  userId: string;
  profile: ProfileDraft;
  prefs: PrefsDraft;
  photos: PhotoRecord[];
  areas: AreaOption[];
  spotify: { enabled: boolean; connected: boolean; displayName: string | null; artists: string[] };
  initialStep: number;
}

export interface StepProps {
  profile: ProfileDraft;
  prefs: PrefsDraft;
  updateProfile: (patch: Partial<ProfileDraft>) => void;
  updatePrefs: (patch: Partial<PrefsDraft>) => void;
  errors: Record<string, string>;
}
