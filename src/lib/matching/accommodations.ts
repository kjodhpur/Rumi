import type { AccommodationConstraintKey, HardFilterFailure, MatchProfile } from "./types";

/**
 * Approved accommodations (Phase 1.E) as hard pairing constraints. Pure.
 *
 * Roommate-level keys change who can be paired. Room-level keys (bathroom, floor, access)
 * don't: they travel with the student into pairing review and the export so staff place
 * the pair in a suitable room. Other students only ever see "housing requirement".
 */
export const ACCOMMODATION_KEYS = [
  "esa_approved",
  "single_bathroom",
  "ground_floor",
  "allergen_free",
  "mobility_accessible",
] as const satisfies readonly AccommodationConstraintKey[];

export const ROOM_LEVEL_ACCOMMODATIONS: readonly AccommodationConstraintKey[] = [
  "single_bathroom",
  "ground_floor",
  "mobility_accessible",
];

export function isAccommodationKey(value: string): value is AccommodationConstraintKey {
  return (ACCOMMODATION_KEYS as readonly string[]).includes(value);
}

/** Does `owner`'s accommodation rule out living with `other`? */
function blocks(owner: MatchProfile, other: MatchProfile): AccommodationConstraintKey | null {
  const keys = owner.accommodations ?? [];
  // An approved animal can't live with someone who ruled out pets.
  if (keys.includes("esa_approved") && other.prefs.dealbreakers.includes("pets"))
    return "esa_approved";
  // Smoke- and allergen-free: no smoking roommate and no roommate bringing a pet.
  if (
    keys.includes("allergen_free") &&
    (other.prefs.smoking !== "never" || other.prefs.pets === "have")
  ) {
    return "allergen_free";
  }
  return null;
}

export function accommodationConflict(a: MatchProfile, b: MatchProfile): HardFilterFailure | null {
  const forA = blocks(a, b);
  if (forA) return { kind: "accommodation", who: "a", constraintKey: forA };
  const forB = blocks(b, a);
  if (forB) return { kind: "accommodation", who: "b", constraintKey: forB };
  return null;
}
