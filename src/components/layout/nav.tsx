"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, User, Bookmark, Shield } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/me", label: "Me", icon: User },
];

export function AppNav({
  unread = 0,
  isAdmin = false,
}: {
  unread?: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-rumi-sand/80 bg-rumi-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/matches" className="text-asu-maroon" aria-label="Rumi home">
          <Wordmark size="sm" />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-asu-maroon/10 text-asu-maroon" : "text-rumi-muted hover:text-asu-maroon",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                {href === "/messages" && unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-asu-maroon px-1 text-[10px] text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                pathname.startsWith("/admin")
                  ? "bg-asu-maroon/10 text-asu-maroon"
                  : "text-rumi-muted hover:text-asu-maroon",
              )}
            >
              <Shield className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
