"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  MessageCircle,
  User,
  Users,
  Inbox,
  Settings,
  Shield,
  Bookmark,
  Bell,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/intros", label: "Intros", icon: Inbox },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/settings", label: "Profile", icon: User },
];

const desktopExtra = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  unreadMessages = 0,
  unreadIntros = 0,
  isAdmin = false,
}: {
  children: React.ReactNode;
  unreadMessages?: number;
  unreadIntros?: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  function badgeFor(href: string) {
    if (href === "/messages" && unreadMessages > 0) return unreadMessages;
    if (href === "/intros" && unreadIntros > 0) return unreadIntros;
    return 0;
  }

  function isActive(href: string) {
    if (href === "/settings") {
      return pathname.startsWith("/settings") || pathname.startsWith("/me");
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside className="glass-nav fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col border-r border-border lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/matches" className="text-accent" aria-label="Rumi home">
            <Wordmark size="sm" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            const badge = badgeFor(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "font-ui relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition duration-fast",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-bg-muted hover:text-ink",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                {label}
                {badge > 0 ? (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-contrast">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <div className="my-3 border-t border-border" />
          {desktopExtra.map(({ href, label, icon: Icon }) => (
            <Link
              key={`extra-${href}`}
              href={href}
              className={cn(
                "font-ui flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition duration-fast",
                isActive(href)
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-bg-muted hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "font-ui mt-auto mb-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin")
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-bg-muted hover:text-ink",
              )}
            >
              <Shield className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              Admin
            </Link>
          ) : (
            <div className="mt-auto mb-4" />
          )}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="glass-nav sticky top-0 z-30 flex h-14 items-center border-b border-border px-4 lg:hidden">
        <Link href="/matches" className="text-accent" aria-label="Rumi home">
          <Wordmark size="sm" />
        </Link>
      </header>

      <main className="mx-auto max-w-content px-4 py-6 pb-[calc(theme(spacing.bottom-nav)+1.5rem)] lg:ml-sidebar lg:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="glass-nav fixed inset-x-0 bottom-0 z-40 flex h-bottom-nav items-stretch justify-around border-t border-border lg:hidden"
        aria-label="Primary"
      >
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const badge = badgeFor(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "font-ui relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition duration-fast",
                active ? "text-accent" : "text-ink-muted",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-contrast">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
