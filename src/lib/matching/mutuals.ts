/**
 * Mutual connections (7.2). A person counts only when both students know them
 * and that person opted in. The two students themselves never count.
 */

export interface KnownPerson {
  id: string;
  optedIn: boolean;
}

export function mutualIds(mine: KnownPerson[], theirs: KnownPerson[]) {
  const theirsOpted = new Set(theirs.filter((person) => person.optedIn).map((person) => person.id));
  return [
    ...new Set(
      mine
        .filter((person) => person.optedIn && theirsOpted.has(person.id))
        .map((person) => person.id),
    ),
  ].sort();
}
