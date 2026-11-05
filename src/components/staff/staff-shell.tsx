"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { Building2, Check, ChevronsUpDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";
import { selectStaffSchool } from "@/app/actions/staff";
import { springSnappy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { isStaffNavActive, STAFF_NAV, type StaffNavSection } from "./staff-nav";

export interface StaffShellProps {
  firstName: string;
  roleLabel: string;
  isPlatformAdmin: boolean;
  school: { id: string; name: string; isDemo: boolean };
  /** White-label (Phase 9): shown beside Rumi's wordmark, never instead of it. */
  brand: { name: string; logoUrl: string | null; accent: string | null };
  schools: { id: string; name: string }[];
  /** Nav items this person's role allows, by href. */
  allowed: string[];
  children: React.ReactNode;
}

export function StaffShell(props: StaffShellProps) {
  const { children } = props;
  const sections = STAFF_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => props.allowed.includes(item.href)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-ink px-4 py-2 text-ink-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="min-h-dvh bg-bg">
        {props.brand.accent ? <AccentBand color={props.brand.accent} /> : null}
        <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col border-r border-line lg:flex">
          <div className="flex h-[72px] items-center gap-2.5 px-6">
            <Link href="/staff" className="rounded-sm text-ink" aria-label="Rumi staff — overview">
              <Wordmark height={22} />
            </Link>
            <Badge size="sm">Staff</Badge>
          </div>
          <SchoolMark brand={props.brand} className="px-6 pb-3" />
          <div className="px-3 pb-3">
            <SchoolSwitcher {...props} />
          </div>
          <SidebarNav sections={sections} />
          <div className="p-3">
            <AccountMenu {...props} />
          </div>
        </aside>

        <div className="lg:pl-[256px]">
          <MobileBar {...props} sections={sections} />
          {props.school.isDemo ? <DemoBanner /> : null}
          <main
            id="main"
            className="mx-auto w-full max-w-[1200px] overflow-x-clip px-4 pt-4 pb-16 sm:px-6 lg:px-10 lg:pt-10"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/** A thin decorative band in the school's secondary accent; interactive color stays Ember. */
function AccentBand({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px]"
      style={{ backgroundColor: color }}
    />
  );
}

/** "Rumi for <School>", with the school's logo when it has one. */
function SchoolMark({
  brand,
  compact = false,
  className,
}: {
  brand: StaffShellProps["brand"];
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {brand.logoUrl ? (
        <span className="relative size-6 shrink-0 overflow-hidden rounded-sm bg-surface ring-1 ring-line">
          <Image src={brand.logoUrl} alt="" fill sizes="24px" className="object-contain" />
        </span>
      ) : brand.accent ? (
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: brand.accent }}
        />
      ) : null}
      <span className={cn("truncate text-ink-2", compact ? "text-caption" : "text-body-sm")}>
        Rumi for {brand.name}
      </span>
    </div>
  );
}

function DemoBanner() {
  return (
    <div
      role="note"
      className="border-b border-line bg-warning-soft px-4 py-2 text-center text-caption font-medium text-ink sm:px-6"
    >
      Demo data — a fictional school for demonstrations. No real students.
    </div>
  );
}

function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: StaffNavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Staff" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
      <LayoutGroup id={onNavigate ? "staff-nav-mobile" : "staff-nav"}>
        {sections.map((section, i) => (
          <div key={section.label ?? i}>
            {section.label ? (
              <p className="px-3 pb-1.5 text-caption font-medium text-ink-3">{section.label}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isStaffNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-md px-3 text-body-sm font-medium outline-none",
                        "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus",
                        active ? "text-ink" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="staff-nav-active"
                          transition={springSnappy}
                          className="absolute inset-0 rounded-md bg-surface shadow-sm ring-1 ring-line"
                        />
                      ) : null}
                      <Icon className="relative size-5" strokeWidth={1.75} aria-hidden />
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </LayoutGroup>
    </nav>
  );
}

function SchoolSwitcher({ school, schools }: StaffShellProps) {
  const router = useRouter();
  if (schools.length < 2) {
    return (
      <div className="flex items-center gap-2.5 rounded-md px-3 py-2 text-body-sm text-ink-2">
        <Building2 className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{school.name}</span>
      </div>
    );
  }
  async function choose(id: string) {
    const result = await selectStaffSchool(id);
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md bg-surface px-3 py-2 text-left text-body-sm text-ink shadow-xs ring-1 ring-line outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
        aria-label={`School: ${school.name}. Switch school`}
      >
        <Building2 className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{school.name}</span>
        <ChevronsUpDown className="size-4 text-ink-3" strokeWidth={1.75} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[232px]">
        <DropdownMenuLabel>Schools</DropdownMenuLabel>
        {schools.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => void choose(s.id)}>
            <span className="truncate">{s.name}</span>
            {s.id === school.id ? <Check className="ml-auto !text-ink" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu({ firstName, roleLabel, isPlatformAdmin }: StaffShellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus data-[state=open]:bg-surface-hover">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-body-sm font-semibold text-ink-2"
        >
          {firstName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium text-ink">{firstName}</span>
          <span className="block truncate text-caption text-ink-3">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="size-4 text-ink-3" strokeWidth={1.75} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[232px]">
        {isPlatformAdmin ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck /> Rumi safety admin
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
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

function MobileBar(props: StaffShellProps & { sections: StaffNavSection[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="glass sticky top-0 z-30 border-b border-[var(--glass-border)] pt-safe lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-ml-2 flex size-11 items-center justify-center rounded-md text-ink outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open staff menu"
          aria-expanded={open}
        >
          <Menu className="size-5" strokeWidth={1.75} aria-hidden />
        </button>
        <Link href="/staff" className="rounded-sm text-ink" aria-label="Rumi staff — overview">
          <Wordmark height={20} />
        </Link>
        <SchoolMark brand={props.brand} compact className="ml-auto min-w-0" />
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Staff menu" hideHeader>
        <div className="flex flex-col gap-4">
          <SchoolSwitcher {...props} />
          <SidebarNav sections={props.sections} onNavigate={() => setOpen(false)} />
          <div className="border-t border-line pt-3">
            <AccountMenu {...props} />
          </div>
        </div>
      </Sheet>
    </header>
  );
}
