/** School staff roles. Platform admins (the Rumi team) live in `admins` and pass every check. */
export const STAFF_ROLES = [
  "housing_admin",
  "housing_staff",
  "ra",
  "analyst",
  "moderator",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_INFO: Record<StaffRole, { label: string; description: string }> = {
  housing_admin: {
    label: "Housing admin",
    description: "Everything: dashboards, term setup, exports, the team and privacy settings.",
  },
  housing_staff: {
    label: "Housing staff",
    description: "Dashboards and pairing review. Can't change the team or privacy settings.",
  },
  ra: {
    label: "RA",
    description: "Only their assigned buildings: check-in alerts and mediation.",
  },
  analyst: {
    label: "Analyst",
    description: "Totals and charts only. Never sees an individual student.",
  },
  moderator: {
    label: "Moderator",
    description: "The school's report queue.",
  },
};

/** What each capability requires. One place to read before adding a staff screen. */
export const CAN = {
  home: ["housing_admin", "housing_staff", "ra", "analyst", "moderator"],
  viewDashboard: ["housing_admin", "housing_staff", "analyst"],
  viewStudents: ["housing_admin", "housing_staff"],
  managePairings: ["housing_admin", "housing_staff"],
  configureTerm: ["housing_admin"],
  manageTeam: ["housing_admin"],
  managePrivacy: ["housing_admin"],
  viewAudit: ["housing_admin"],
  export: ["housing_admin"],
  raWorkspace: ["housing_admin", "housing_staff", "ra"],
  moderate: ["housing_admin", "moderator"],
  configureEscalation: ["housing_admin"],
  /** Further limited in SQL (can_manage_accommodations): housing staff need the accommodations scope. */
  manageAccommodations: ["housing_admin", "housing_staff"],
  /** Aggregates for analysts and leads; RAs see their own buildings only (enforced in SQL). */
  viewAnalytics: ["housing_admin", "housing_staff", "analyst", "ra"],
  configureSchool: ["housing_admin"],
  /** Room-change reason tags (1.B); RAs only within their buildings. */
  tagRoomChanges: ["housing_admin", "housing_staff", "ra"],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Capability = keyof typeof CAN;

export interface StaffScopes {
  buildings: string[];
  communities: string[];
  /** Housing staff who coordinate approved accommodations. */
  accommodations: boolean;
}

export function parseScopes(value: unknown): StaffScopes {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    buildings: list(record.buildings),
    communities: list(record.communities),
    accommodations: record.accommodations === true,
  };
}

export function roleCan(role: StaffRole | "platform_admin", capability: Capability) {
  return role === "platform_admin" || (CAN[capability] as readonly string[]).includes(role);
}

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}
