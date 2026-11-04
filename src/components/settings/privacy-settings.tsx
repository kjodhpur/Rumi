"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updatePrivacy } from "@/app/actions/settings";
import { unblockUser } from "@/app/actions/social";
import { SettingsBack, SettingsSection, SettingsToggleRow } from "./settings-ui";
import { ConsentSettings, type ConsentEvent, type ConsentRow } from "./consent-settings";
import { FamilyShareManager } from "./family-share-manager";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { useIntlLocale, useT } from "@/components/providers/i18n";

interface Blocked {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
}

export function PrivacySettings({
  initial,
  verifiedUntil,
  blocked: initialBlocked,
  consents,
  consentHistory,
  studentIdLast4,
}: {
  initial: { is_hidden: boolean; verified_only: boolean };
  verifiedUntil: string | null;
  blocked: Blocked[];
  consents: ConsentRow[];
  consentHistory: ConsentEvent[];
  studentIdLast4: string | null;
}) {
  const t = useT("privacy");
  const intl = useIntlLocale();
  const [values, setValues] = React.useState(initial);
  const [blocked, setBlocked] = React.useState(initialBlocked);
  const verified = verifiedUntil ? Date.parse(verifiedUntil) > Date.now() : false;

  async function toggle(key: keyof typeof values, value: boolean) {
    setValues((v) => ({ ...v, [key]: value }));
    const result = await updatePrivacy({ [key]: value });
    if (!result.ok) {
      setValues((v) => ({ ...v, [key]: !value }));
      toast.error(result.error);
      return;
    }
    if (key === "is_hidden") {
      toast.success(value ? t("hidden") : t("visible"), {
        description: value ? t("hiddenHint") : undefined,
      });
    }
  }

  async function unblock(person: Blocked) {
    const result = await unblockUser(person.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBlocked((list) => list.filter((b) => b.id !== person.id));
    toast(t("unblocked", { name: person.firstName }));
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title={t("title")} description={t("description")} />

      <div className="flex items-start gap-3.5 rounded-lg bg-surface p-4 ring-1 ring-line">
        {verified ? (
          <BadgeCheck className="mt-0.5 size-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        ) : (
          <ShieldAlert
            className="mt-0.5 size-6 shrink-0 text-warning"
            strokeWidth={2}
            aria-hidden
          />
        )}
        <div className="flex-1">
          <p className="text-body-sm font-semibold text-ink">
            {verified ? t("verified") : t("notVerified")}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-2">
            {verified
              ? t("verifiedBody", {
                  date: new Date(verifiedUntil!).toLocaleDateString(intl, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                })
              : t("notVerifiedBody")}
          </p>
          {!verified ? (
            <Button asChild size="sm" className="mt-3">
              <Link href="/login?next=/settings/privacy">{t("reverify")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <SettingsSection title={t("visibility")}>
        <SettingsToggleRow
          label={t("hide")}
          description={t("hideHint")}
          checked={values.is_hidden}
          onCheckedChange={(v) => void toggle("is_hidden", v)}
        />
        <SettingsToggleRow
          label={t("verifiedOnly")}
          description={t("verifiedOnlyHint")}
          checked={values.verified_only}
          onCheckedChange={(v) => void toggle("verified_only", v)}
        />
      </SettingsSection>

      <ConsentSettings
        consents={consents}
        history={consentHistory}
        studentIdLast4={studentIdLast4}
      />

      <SettingsSection title={t("blocked")} footer={t("blockedFooter")}>
        {blocked.length === 0 ? (
          <p className="px-4 py-4 text-body-sm text-ink-3">{t("noBlocked")}</p>
        ) : (
          blocked.map((person) => (
            <div key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar
                src={person.avatarUrl}
                firstName={person.firstName}
                lastInitial={person.lastInitial}
                size={36}
              />
              <span className="flex-1 text-body-sm font-medium text-ink">
                {person.firstName} {person.lastInitial}.
              </span>
              <Button variant="secondary" size="sm" onClick={() => void unblock(person)}>
                {t("unblock")}
              </Button>
            </div>
          ))
        )}
      </SettingsSection>

      <SettingsSection title={t("family")}>
        <div className="p-4">
          <FamilyShareManager />
        </div>
      </SettingsSection>

      <SettingsSection title={t("safe")}>
        <ul className="flex flex-col gap-2 px-4 py-4 text-body-sm text-ink-2">
          <li>{t("safe1")}</li>
          <li>{t("safe2")}</li>
          <li>{t("safe3")}</li>
          <li>
            {t("safe4", { police: LAUNCH_SCHOOL.police.name })}{" "}
            <a
              href={`tel:${LAUNCH_SCHOOL.police.phone.replace(/[^\d+]/g, "")}`}
              className="underline underline-offset-4"
            >
              {LAUNCH_SCHOOL.police.phone}
            </a>
            .
          </li>
        </ul>
      </SettingsSection>
    </div>
  );
}
