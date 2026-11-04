import {
  Bell,
  Bookmark,
  Compass,
  MessageCircle,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey = "messages" | "notifications" | "groups";

export type NavLabel = "matches" | "messages" | "groups" | "saved" | "notifications" | "admin";

export interface NavItem {
  href: string;
  label: NavLabel;
  icon: LucideIcon;
  badge?: BadgeKey;
  /** Other path prefixes that should light this item up. */
  match?: string[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/matches", label: "matches", icon: Compass, match: ["/matches", "/profile"] },
  { href: "/messages", label: "messages", icon: MessageCircle, badge: "messages" },
  { href: "/groups", label: "groups", icon: Users, badge: "groups" },
];

export const DESKTOP_EXTRA_NAV: NavItem[] = [
  { href: "/matches?view=saved", label: "saved", icon: Bookmark },
  { href: "/notifications", label: "notifications", icon: Bell, badge: "notifications" },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "admin", icon: ShieldCheck };

export function isActive(pathname: string, item: NavItem) {
  const base = item.href.split("?")[0];
  const prefixes = item.match ?? [base];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
