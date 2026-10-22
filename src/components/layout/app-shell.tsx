"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTheme } from "next-themes";
import {
  Bell,
  Check,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar } from "@/components/ui/avatar";
import { CountBubble } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiveProvider, useLive } from "@/components/realtime/live-provider";
import { ProfileOverlayProvider } from "@/components/profile/profile-overlay";
import { signOut } from "@/app/actions/auth";
import type { BadgeCounts } from "@/app/actions/badges";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";
import { ADMIN_NAV, DESKTOP_EXTRA_NAV, PRIMARY_NAV, isActive, type NavItem } from "./nav-items";
import { PageTitleProvider, usePageTitleState } from "./page-title";

export interface ShellUser {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function AppShell({
  user,
  initialCounts,
  children,
}: {
  user: ShellUser;
  initialCounts: BadgeCounts;
  children: React.ReactNode;
}) {
  return (
    <LiveProvider userId={user.id} initialCounts={initialCounts}>
      <ProfileOverlayProvider>
        <PageTitleProvider>
          <a
            href="#main"
            className="sr-only z-[100] rounded-md bg-ink px-4 py-2 text-ink-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <div className="min-h-dvh bg-bg">
            <Sidebar user={user} />
            <div className="lg:pl-[248px]">
              <TopBar />
              <main
                id="main"
                className="mx-auto w-full max-w-[1120px] overflow-x-clip px-4 pt-2 pb-[calc(88px+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
              >
                {children}
              </main>
            </div>
            <TabBar user={user} />
          </div>
        </PageTitleProvider>
      </ProfileOverlayProvider>
    </LiveProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { counts } = useLive();
  const savedView = pathname === "/matches" && search.get("view") === "saved";

  const items = [...PRIMARY_NAV, ...DESKTOP_EXTRA_NAV, ...(user.isAdmin ? [ADMIN_NAV] : [])];
  const activeHref = items.find((item) => {
    if (item.href === "/matches?view=saved") return savedView;
    if (item.href === "/matches") return isActive(pathname, item) && !savedView;
    return isActive(pathname, item);
  })?.href;

  return (
    <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line lg:flex">
      <div className="flex h-[72px] items-center px-6">
        <Link href="/matches" className="rounded-sm text-ink" aria-label="Rumi — matches">
          <Wordmark height={24} />
        </Link>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col px-3">
        <LayoutGroup id="sidebar">
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={activeHref === item.href}
                count={item.badge ? counts[item.badge] : 0}
              />
            ))}
          </ul>
          <div className="mx-3 my-4 h-px bg-line" />
          <ul className="flex flex-col gap-0.5">
            {DESKTOP_EXTRA_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={activeHref === item.href}
                count={item.badge ? counts[item.badge] : 0}
              />
            ))}
            {user.isAdmin ? (
              <SidebarLink item={ADMIN_NAV} active={activeHref === ADMIN_NAV.href} count={0} />
            ) : null}
          </ul>
        </LayoutGroup>
      </nav>
      <div className="p-3">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-md px-3 text-body-sm font-medium outline-none",
          "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus",
          active ? "text-ink" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
        )}
      >
        {active ? (
          <motion.span
            layoutId="sidebar-active"
            transition={springSnappy}
            className="absolute inset-0 rounded-md bg-surface shadow-sm ring-1 ring-line"
          />
        ) : null}
        <Icon className="relative size-5" strokeWidth={1.75} aria-hidden />
        <span className="relative">{item.label}</span>
        {count > 0 ? (
          <>
            <CountBubble count={count} className="relative ml-auto" />
            <span className="sr-only">({count} new)</span>
          </>
        ) : null}
      </Link>
    </li>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const { theme, setTheme } = useTheme();
  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-surface-hover">
        <Avatar
          src={user.avatarUrl}
          firstName={user.firstName}
          lastInitial={user.lastInitial}
          size={36}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium text-ink">
            {user.firstName} {user.lastInitial ? `${user.lastInitial}.` : ""}
          </span>
          <span className="block text-caption text-ink-3">Your account</span>
        </span>
        <ChevronsUpDown className="size-4 text-ink-3" strokeWidth={1.75} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[224px]">
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user.id}`}>
            <UserRound /> View your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={(e) => {
              e.preventDefault();
              setTheme(value);
            }}
          >
            <Icon /> {label}
            {theme === value ? <Check className="ml-auto !text-ink" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile chrome
// ─────────────────────────────────────────────────────────────────────────────

function TopBar() {
  const { counts } = useLive();
  const { title, collapsed } = usePageTitleState();
  const pathname = usePathname();
  // Detail screens (chat, profile) draw their own header.
  if (/^\/(messages|groups|settings|profile)\/.+/.test(pathname)) return null;

  return (
    <header className="glass sticky top-0 z-30 border-b border-[var(--glass-border)] pt-safe lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="relative h-7 min-w-0 flex-1">
          <AnimatePresence initial={false} mode="popLayout">
            {collapsed && title ? (
              <motion.span
                key="title"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={springSnappy}
                className="absolute inset-y-0 left-0 flex items-center truncate text-title font-semibold text-ink"
              >
                {title}
              </motion.span>
            ) : (
              <motion.span
                key="mark"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={springSnappy}
                className="absolute inset-y-0 left-0 flex items-center text-ink"
              >
                <Link href="/matches" aria-label="Rumi — matches" className="rounded-sm">
                  <Wordmark height={20} />
                </Link>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <Link
          href="/notifications"
          className="relative -mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors active:bg-surface-hover"
          aria-label={
            counts.notifications > 0
              ? `Notifications, ${counts.notifications} unread`
              : "Notifications"
          }
        >
          <Bell className="size-[22px]" strokeWidth={1.75} aria-hidden />
          <CountBubble count={counts.notifications} className="absolute top-1.5 right-1" />
        </Link>
      </div>
    </header>
  );
}

function TabBar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const { counts } = useLive();
  const youActive = pathname.startsWith("/settings") || pathname === `/profile/${user.id}`;

  // Full-screen detail views (an open chat) hide the tab bar for more room.
  if (/^\/messages\/.+/.test(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-border)] pb-safe lg:hidden"
    >
      <LayoutGroup id="tabbar">
        <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item) && !youActive;
            const count = item.badge ? counts[item.badge] : 0;
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex">
                <TabLink href={item.href} active={active} label={item.label} count={count}>
                  <Icon className="size-6" strokeWidth={active ? 2 : 1.75} aria-hidden />
                </TabLink>
              </li>
            );
          })}
          <li className="flex">
            <TabLink href="/settings" active={youActive} label="You" count={0}>
              <Avatar
                src={user.avatarUrl}
                firstName={user.firstName}
                lastInitial={user.lastInitial}
                size={26}
                className={cn(
                  "rounded-full",
                  youActive && "ring-2 ring-ink ring-offset-2 ring-offset-bg",
                )}
              />
            </TabLink>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 outline-none",
        "transition-[color,transform] duration-150 active:scale-95",
        active ? "text-ink" : "text-ink-3",
      )}
    >
      <span className="relative flex h-7 w-14 items-center justify-center">
        {active ? (
          <motion.span
            layoutId="tab-active"
            transition={springSnappy}
            className="absolute inset-0 rounded-full bg-surface-sunken"
          />
        ) : null}
        <span className="relative">{children}</span>
        {count > 0 ? <CountBubble count={count} className="absolute -top-1 right-1.5" /> : null}
      </span>
      <span className="text-[11px] leading-none font-medium">
        {label}
        {count > 0 ? <span className="sr-only">, {count} new</span> : null}
      </span>
    </Link>
  );
}
