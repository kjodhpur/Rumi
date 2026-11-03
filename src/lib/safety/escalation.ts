export const ESCALATION_CATEGORIES = [
  {
    key: "harassment",
    label: "Harassment or sexual misconduct",
    description: "Unwanted sexual advances, stalking, coercion, or severe/persistent harassment.",
    suggestedOffice: "Title IX / Student Rights & Responsibilities",
  },
  {
    key: "threat",
    label: "Threat of harm or violence",
    description: "Physical threats, weapons, self-harm signals, or immediate safety hazards.",
    suggestedOffice: "Campus Police & Public Safety",
  },
  {
    key: "discrimination",
    label: "Discrimination or bias incident",
    description: "Targeted hostility based on race, religion, gender, disability, or protected status.",
    suggestedOffice: "Dean of Students / Office of Inclusion",
  },
  {
    key: "wellbeing",
    label: "Wellbeing or mental health concern",
    description: "Roommate or student in acute emotional distress, withdrawal, or needing welfare check.",
    suggestedOffice: "CARE Team / Student Wellbeing Services",
  },
  {
    key: "general",
    label: "Urgent housing safety concern",
    description: "Urgent facilities hazard, physical altercation risk, or after-hours lockouts.",
    suggestedOffice: "Housing Staff On-Call",
  },
] as const;

export type EscalationCategory = (typeof ESCALATION_CATEGORIES)[number]["key"];

export interface EscalationRoute {
  id: string;
  schoolId: string;
  category: EscalationCategory;
  destinationLabel: string;
  url: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyResource {
  name: string;
  phone: string;
  detail: string;
  url?: string;
}

export const NATIONAL_EMERGENCY_RESOURCES: EmergencyResource[] = [
  {
    name: "911 Emergency",
    phone: "911",
    detail: "Immediate danger, crime in progress, or medical emergency. 24/7.",
  },
  {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    detail: "Free, confidential 24/7 call or text for mental health or distress.",
    url: "https://988lifeline.org",
  },
  {
    name: "RAINN Sexual Assault Hotline",
    phone: "1-800-656-4673",
    detail: "National Sexual Assault Hotline. Free, confidential support 24/7.",
    url: "https://www.rainn.org",
  },
  {
    name: "National Domestic Violence Hotline",
    phone: "1-800-799-7233",
    detail: "Confidential 24/7 phone and text support.",
    url: "https://www.thehotline.org",
  },
];

export const SAFETY_DISCLAIMER =
  "Rumi is a peer platform and does not replace campus safety, police, Title IX, or emergency care. In an emergency, dial 911 or campus police immediately.";

/**
 * Resolves the destination for a given category from the school's configured routes.
 * Returns null if no active route is configured, triggering the national resources fallback.
 */
export function resolveEscalationDestination(
  category: EscalationCategory,
  routes: readonly EscalationRoute[],
): EscalationRoute | null {
  return routes.find((r) => r.category === category && r.active) ?? null;
}

export function isEscalationCategory(value: string): value is EscalationCategory {
  return (ESCALATION_CATEGORIES as readonly { key: string }[]).some((c) => c.key === value);
}
