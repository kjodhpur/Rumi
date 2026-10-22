import { Bell, Bookmark, Compass, MessageCircle, ShieldCheck, Users, type LucideIcon } from "lucide-react";

export type BadgeKey = "messages" | "notifications" | "groups";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: BadgeKey;
  /** Other path prefixes that should light this item up. */
  match?: string[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/matches", label: "Matches", icon: Compass, match: ["/matches", "/profile"] },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  { href: "/groups", label: "Groups", icon: Users, badge: "groups" },
];

export const DESKTOP_EXTRA_NAV: NavItem[] = [
  { href: "/matches?view=saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function isActive(pathname: string, item: NavItem) {
  const base = item.href.split("?")[0];
  const prefixes = item.match ?? [base];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
