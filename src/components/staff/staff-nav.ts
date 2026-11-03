import { CalendarDays, ClipboardCheck, FileSpreadsheet, HeartHandshake, LayoutDashboard, ScrollText, ShieldCheck, UserRoundSearch, Users, type LucideIcon } from "lucide-react";
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
    items: [
      { href: "/staff", label: "Overview", icon: LayoutDashboard, capability: "home" },
      { href: "/staff/students", label: "Students", icon: UserRoundSearch, capability: "viewStudents" },
      { href: "/staff/pairings", label: "Pairings", icon: HeartHandshake, capability: "managePairings" },
      { href: "/staff/ra", label: "Check-ins", icon: ClipboardCheck, capability: "raWorkspace" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/staff/integrations/starrez", label: "StarRez export", icon: FileSpreadsheet, capability: "export" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/staff/settings/term", label: "Term", icon: CalendarDays, capability: "configureTerm" },
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
