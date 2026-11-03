export type ChoreCadence = "daily" | "weekly" | "biweekly" | "monthly";

/**
 * Returns the next assignee in the rotation wheel.
 */
export function getNextAssignee(
  rotation: string[],
  lastAssigneeId?: string | null,
): string | null {
  if (!rotation || rotation.length === 0) return null;
  if (!lastAssigneeId) return rotation[0];

  const idx = rotation.indexOf(lastAssigneeId);
  if (idx === -1 || idx === rotation.length - 1) {
    return rotation[0];
  }

  return rotation[idx + 1];
}

/**
 * Calculates the next due date based on cadence.
 */
export function calculateNextDueDate(
  fromDate: Date = new Date(),
  cadence: ChoreCadence = "weekly",
): string {
  const d = new Date(fromDate);
  switch (cadence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setDate(d.getDate() + 30);
      break;
  }
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export const DEFAULT_CHORE_TEMPLATES: { title: string; cadence: ChoreCadence }[] = [
  { title: "Take out trash & recycling", cadence: "weekly" },
  { title: "Clean bathroom counter & sink", cadence: "weekly" },
  { title: "Sweep & vacuum common area", cadence: "weekly" },
  { title: "Wipe down kitchen counters & microwave", cadence: "weekly" },
];
