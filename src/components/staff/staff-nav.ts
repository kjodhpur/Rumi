import { LayoutDashboard, ScrollText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { Capability } from "@/lib/staff/roles";

export interface StaffNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  capability: Capability;
  /** Extra path prefixes that light this item up. */
  match?: string[];
}

export interface StaffNavSection {
  label?: string;
  items: StaffNavItem[];
}

export const STAFF_NAV: StaffNavSection[] = [
  {
    items: [{ href: "/staff", label: "Overview", icon: LayoutDashboard, capability: "home" }],
  },
  {
    label: "Settings",
    items: [
      { href: "/staff/settings/team", label: "Team", icon: Users, capability: "manageTeam" },
      { href: "/staff/settings/privacy", label: "Privacy & retention", icon: ShieldCheck, capability: "managePrivacy" },
      { href: "/staff/audit", label: "Audit log", icon: ScrollText, capability: "viewAudit" },
    ],
  },
];

export function isStaffNavActive(pathname: string, item: StaffNavItem) {
  if (item.href === "/staff") return pathname === "/staff";
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
