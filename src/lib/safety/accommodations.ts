import type { AccommodationConstraintKey, MatchProfile } from "@/lib/matching/types";

export const ACCOMMODATION_LABELS: Record<
  AccommodationConstraintKey,
  { label: string; description: string }
> = {
  esa_approved: {
    label: "Approved Emotional Support Animal (ESA)",
    description: "Student has approved documentation for an ESA; incompatible with students with pet allergies or pet dealbreakers.",
  },
  single_bathroom: {
    label: "Single-Occupancy Bathroom Required",
    description: "Medical necessity for private/semi-private restroom facility.",
  },
  ground_floor: {
    label: "Ground Floor / Low Elevation Required",
    description: "Mobility accessibility requirement for residence hall assignment.",
  },
  allergen_free: {
    label: "Allergen-Free / Strictly Smoke-Free",
    description: "Severe respiratory or contact allergy requirement; strictly incompatible with any smoking.",
  },
  mobility_accessible: {
    label: "Mobility Accessible Room",
    description: "ADA-accessible door clearances, turning radius, and zero-threshold entry.",
  },
};

export function isAccommodationConstraintKey(key: string): key is AccommodationConstraintKey {
  return key in ACCOMMODATION_LABELS;
}

/**
 * Pure function: checks whether accommodation constraints between two student profiles
 * create a hard conflict.
 */
export function checkAccommodationConflict(
  a: MatchProfile,
  b: MatchProfile,
): { conflict: boolean; reason: string | null } {
  // ESA vs Pet dealbreaker / allergy
  if (a.accommodations?.includes("esa_approved") && b.prefs.dealbreakers.includes("pets")) {
    return { conflict: true, reason: "housing requirement" };
  }
  if (b.accommodations?.includes("esa_approved") && a.prefs.dealbreakers.includes("pets")) {
    return { conflict: true, reason: "housing requirement" };
  }

  // Allergen-free vs smoking
  if (a.accommodations?.includes("allergen_free") && b.prefs.smoking !== "never") {
    return { conflict: true, reason: "housing requirement" };
  }
  if (b.accommodations?.includes("allergen_free") && a.prefs.smoking !== "never") {
    return { conflict: true, reason: "housing requirement" };
  }

  return { conflict: false, reason: null };
}
