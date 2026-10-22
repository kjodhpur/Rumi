export interface MatchCardData {
  id: string;
  firstName: string;
  lastInitial: string;
  classYear: string | null;
  major: string | null;
  avatarUrl: string | null;
  placeholder: string | null;
  photoCount: number;
  verified: boolean;
  score: number;
  reasons: string[];
  watchouts: string[];
  sharedArtists: string[];
  budgetMin: number;
  budgetMax: number;
  moveInDate: string | null;
  areaNames: string[];
  isSaved: boolean;
  introStatus: "pending" | "accepted" | null;
}
