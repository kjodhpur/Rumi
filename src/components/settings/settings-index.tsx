"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  CalendarCheck,
  ClipboardCheck,
  Download,
  Link2,
  LogOut,
  Monitor,
  Moon,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useHydrated } from "@/hooks/use-hydrated";
import { signOut } from "@/app/actions/auth";
import { updateTheme } from "@/app/actions/settings";
import { SettingsLinkRow, SettingsSection } from "./settings-ui";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { LinkSchoolEmail } from "./link-school-email";
import { LanguagePicker } from "./language-picker";
import { useT } from "@/components/providers/i18n";

export function SettingsIndex({
  user,
}: {
  user: {
    id: string;
    firstName: string;
    lastInitial: string;
    avatarUrl: string | null;
    email: string;
    verifiedUntil: string | null;
    isAdmin: boolean;
    preArrival: boolean;
    schoolDomain: string | null;
  };
}) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const t = useT("settings");

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <PageHeader title={t("title")} />

      <Link
        href={`/profile/${user.id}`}
        className="-mt-4 flex items-center gap-4 rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Avatar
          src={user.avatarUrl}
          firstName={user.firstName}
          lastInitial={user.lastInitial}
          size={56}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-ink">
            {user.firstName} {user.lastInitial}.
          </span>
          <span className="block truncate text-body-sm text-ink-3">{user.email}</span>
        </span>
        <span className="hidden text-body-sm text-ink-2 sm:inline">{t("viewProfile")}</span>
        <ChevronRight className="size-4 text-ink-3" strokeWidth={2} aria-hidden />
      </Link>

      {user.preArrival ? (
        <LinkSchoolEmail domain={user.schoolDomain ?? LAUNCH_SCHOOL.domain} />
      ) : null}

      <SettingsSection title={t("sections.profile")}>
        <SettingsLinkRow
          href="/settings/profile"
          icon={<SlidersHorizontal />}
          label={t("rows.profile")}
          detail={t("rows.profileDetail")}
        />
        <SettingsLinkRow
          href="/settings/scenarios"
          icon={<Sparkles />}
          label={t("rows.scenarios")}
          detail={t("rows.scenariosDetail")}
        />
      </SettingsSection>

      <SettingsSection title={t("sections.living")}>
        <SettingsLinkRow
          href="/check-in"
          icon={<ClipboardCheck />}
          label={t("rows.checkins")}
          detail={t("rows.checkinsDetail")}
        />
        <SettingsLinkRow
          href="/survey"
          icon={<CalendarCheck />}
          label={t("rows.survey")}
          detail={t("rows.surveyDetail")}
        />
      </SettingsSection>

      <SettingsSection title={t("sections.preferences")}>
        <SettingsLinkRow
          href="/settings/notifications"
          icon={<Bell />}
          label={t("rows.notifications")}
        />
        <SettingsLinkRow
          href="/settings/privacy"
          icon={<ShieldCheck />}
          label={t("rows.privacy")}
        />
        <SettingsLinkRow href="/settings/accounts" icon={<Link2 />} label={t("rows.accounts")} />
        <LanguagePicker />
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-body-sm font-medium text-ink">{t("appearance")}</span>
          <SegmentedControl
            aria-label={t("themeLabel")}
            size="sm"
            className="sm:w-[300px]"
            value={(hydrated ? theme : "system") as "system" | "light" | "dark"}
            onValueChange={(value) => {
              setTheme(value);
              void updateTheme(value);
            }}
            options={[
              {
                value: "system",
                label: (
                  <>
                    <Monitor className="size-3.5" strokeWidth={2} aria-hidden /> {t("theme.system")}
                  </>
                ),
              },
              {
                value: "light",
                label: (
                  <>
                    <Sun className="size-3.5" strokeWidth={2} aria-hidden /> {t("theme.light")}
                  </>
                ),
              },
              {
                value: "dark",
                label: (
                  <>
                    <Moon className="size-3.5" strokeWidth={2} aria-hidden /> {t("theme.dark")}
                  </>
                ),
              },
            ]}
          />
        </div>
      </SettingsSection>

      {user.isAdmin ? (
        <SettingsSection title={t("sections.team")}>
          <SettingsLinkRow
            href="/admin"
            icon={<ShieldAlert />}
            label={t("rows.admin")}
            detail={t("rows.adminDetail")}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title={t("sections.data")} footer={t("rows.downloadFooter")}>
        <SettingsLinkRow
          href="/api/account/export"
          icon={<Download />}
          label={t("rows.download")}
          download
        />
      </SettingsSection>

      <SettingsSection title={t("sections.account")}>
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-14 w-full items-center gap-3.5 px-4 py-3 text-left text-ink transition-colors outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
              <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-body-sm font-medium">{t("rows.signOut")}</span>
          </button>
        </form>
        <SettingsLinkRow
          href="/settings/account"
          icon={<Trash2 />}
          label={t("rows.delete")}
          danger
        />
      </SettingsSection>

      <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-4 text-caption text-ink-3">
        <Link href="/terms" className="hover:text-ink-2">
          {t("footer.terms")}
        </Link>
        <Link href="/privacy" className="hover:text-ink-2">
          {t("footer.privacy")}
        </Link>
        <span>{t("footer.notAffiliated", { school: LAUNCH_SCHOOL.shortName })}</span>
      </p>
    </div>
  );
}
