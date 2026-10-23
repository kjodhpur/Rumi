"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, Download, Link2, LogOut, Monitor, Moon, ShieldAlert, ShieldCheck, SlidersHorizontal, Sun, Trash2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useHydrated } from "@/hooks/use-hydrated";
import { signOut } from "@/app/actions/auth";
import { updateTheme } from "@/app/actions/settings";
import { SettingsLinkRow, SettingsSection } from "./settings-ui";
import { LAUNCH_SCHOOL } from "@/lib/school";

export function SettingsIndex({
  user,
}: {
  user: { id: string; firstName: string; lastInitial: string; avatarUrl: string | null; email: string; verifiedUntil: string | null; isAdmin: boolean };
}) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <PageHeader title="Settings" />

      <Link
        href={`/profile/${user.id}`}
        className="-mt-4 flex items-center gap-4 rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Avatar src={user.avatarUrl} firstName={user.firstName} lastInitial={user.lastInitial} size={56} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-ink">
            {user.firstName} {user.lastInitial}.
          </span>
          <span className="block truncate text-body-sm text-ink-3">{user.email}</span>
        </span>
        <span className="hidden text-body-sm text-ink-2 sm:inline">View profile</span>
        <ChevronRight className="size-4 text-ink-3" strokeWidth={2} aria-hidden />
      </Link>

      <SettingsSection title="Profile">
        <SettingsLinkRow href="/settings/profile" icon={<SlidersHorizontal />} label="Profile & preferences" detail="Photos, budget, lifestyle" />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsLinkRow href="/settings/notifications" icon={<Bell />} label="Notifications" />
        <SettingsLinkRow href="/settings/privacy" icon={<ShieldCheck />} label="Privacy & safety" />
        <SettingsLinkRow href="/settings/accounts" icon={<Link2 />} label="Connected accounts" />
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-body-sm font-medium text-ink">Appearance</span>
          <SegmentedControl
            aria-label="Theme"
            size="sm"
            className="sm:w-[300px]"
            value={(hydrated ? theme : "system") as "system" | "light" | "dark"}
            onValueChange={(value) => {
              setTheme(value);
              void updateTheme(value);
            }}
            options={[
              { value: "system", label: <><Monitor className="size-3.5" strokeWidth={2} aria-hidden /> System</> },
              { value: "light", label: <><Sun className="size-3.5" strokeWidth={2} aria-hidden /> Light</> },
              { value: "dark", label: <><Moon className="size-3.5" strokeWidth={2} aria-hidden /> Dark</> },
            ]}
          />
        </div>
      </SettingsSection>

      {user.isAdmin ? (
        <SettingsSection title="Team">
          <SettingsLinkRow href="/admin" icon={<ShieldAlert />} label="Safety admin" detail="Reports & accounts" />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Your data" footer="A JSON file with everything Rumi stores about you.">
        <SettingsLinkRow href="/api/account/export" icon={<Download />} label="Download your data" download />
      </SettingsSection>

      <SettingsSection title="Account">
        <form action={signOut}>
          <button type="submit" className="flex min-h-14 w-full items-center gap-3.5 px-4 py-3 text-left text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
              <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-body-sm font-medium">Sign out</span>
          </button>
        </form>
        <SettingsLinkRow href="/settings/account" icon={<Trash2 />} label="Delete account" danger />
      </SettingsSection>

      <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-4 text-caption text-ink-3">
        <Link href="/terms" className="hover:text-ink-2">Terms</Link>
        <Link href="/privacy" className="hover:text-ink-2">Privacy</Link>
        <span>Rumi · Not affiliated with {LAUNCH_SCHOOL.shortName}</span>
      </p>
    </div>
  );
}
