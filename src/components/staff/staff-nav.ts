import {
  Accessibility,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  HeartHandshake,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserRoundSearch,
  Users,
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  Link2,
  PieChart,
  Shuffle,
  GraduationCap,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
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
      {
        href: "/staff/setup",
        label: "Setup checklist",
        icon: CheckCircle2,
        capability: "viewDashboard",
      },
      { href: "/staff/outcomes", label: "Outcomes", icon: BarChart3, capability: "viewDashboard" },
      {
        href: "/staff/analytics/segments",
        label: "Segments",
        icon: PieChart,
        capability: "viewAnalytics",
      },
      {
        href: "/staff/analytics/room-changes",
        label: "Room changes",
        icon: Shuffle,
        capability: "viewAnalytics",
      },
      {
        href: "/staff/students",
        label: "Students",
        icon: UserRoundSearch,
        capability: "viewStudents",
      },
      {
        href: "/staff/pairings",
        label: "Pairings",
        icon: HeartHandshake,
        capability: "managePairings",
      },
      {
        href: "/staff/swaps",
        label: "Room swaps",
        icon: ArrowLeftRight,
        capability: "managePairings",
      },
      {
        href: "/staff/accommodations",
        label: "Accommodations",
        icon: Accessibility,
        capability: "manageAccommodations",
      },
      { href: "/staff/ra", label: "Check-ins", icon: ClipboardCheck, capability: "raWorkspace" },
      {
        href: "/staff/safety",
        label: "Safety & reports",
        icon: ShieldAlert,
        capability: "moderate",
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        href: "/staff/integrations/starrez",
        label: "StarRez integration",
        icon: FileSpreadsheet,
        capability: "export",
      },
      {
        href: "/staff/integrations/links",
        label: "Entry links",
        icon: Link2,
        capability: "viewDashboard",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        href: "/staff/settings/plan",
        label: "Plan & beds",
        icon: Sparkles,
        capability: "viewDashboard",
      },
      {
        href: "/staff/settings/term",
        label: "Term",
        icon: CalendarDays,
        capability: "configureTerm",
      },
      {
        href: "/staff/settings/admissions",
        label: "Admitted students",
        icon: GraduationCap,
        capability: "configureSchool",
      },
      { href: "/staff/settings/team", label: "Team", icon: Users, capability: "manageTeam" },
      {
        href: "/staff/settings/escalation",
        label: "Escalation routes",
        icon: Siren,
        capability: "configureEscalation",
      },
      {
        href: "/staff/settings/privacy",
        label: "Privacy & retention",
        icon: ShieldCheck,
        capability: "managePrivacy",
      },
      { href: "/staff/audit", label: "Audit log", icon: ScrollText, capability: "viewAudit" },
    ],
  },
];

export function isStaffNavActive(pathname: string, item: StaffNavItem) {
  if (item.href === "/staff") return pathname === "/staff";
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
