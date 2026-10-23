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
import { LAUNCH_SCHOOL } from "@/lib/school";

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
}: {
  initial: { is_hidden: boolean; verified_only: boolean };
  verifiedUntil: string | null;
  blocked: Blocked[];
}) {
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
      toast.success(value ? "Your profile is hidden" : "Your profile is visible again", {
        description: value ? "You won't appear in anyone's matches. Existing chats still work." : undefined,
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
    toast(`${person.firstName} is unblocked`);
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title="Privacy & safety" description="Control who sees you and who can reach you." />

      <div className="flex items-start gap-3.5 rounded-lg bg-surface p-4 ring-1 ring-line">
        {verified ? (
          <BadgeCheck className="mt-0.5 size-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 size-6 shrink-0 text-warning" strokeWidth={2} aria-hidden />
        )}
        <div className="flex-1">
          <p className="text-body-sm font-semibold text-ink">{verified ? "Verified student" : "Verification expired"}</p>
          <p className="mt-0.5 text-body-sm text-ink-2">
            {verified
              ? `Confirmed through your school email. Renews automatically each time you sign in with it (valid until ${new Date(verifiedUntil!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}).`
              : "Sign in again with your school email to re-verify. Until then, profiles set to verified-only are hidden from you."}
          </p>
          {!verified ? (
            <Button asChild size="sm" className="mt-3">
              <Link href="/login?next=/settings/privacy">Re-verify now</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <SettingsSection title="Visibility">
        <SettingsToggleRow
          label="Hide my profile"
          description="Take a break: you won't appear in matches or groups. Chats you already have keep working."
          checked={values.is_hidden}
          onCheckedChange={(v) => void toggle("is_hidden", v)}
        />
        <SettingsToggleRow
          label="Verified students only"
          description="Only students whose school email is currently verified can see your profile or contact you."
          checked={values.verified_only}
          onCheckedChange={(v) => void toggle("verified_only", v)}
        />
      </SettingsSection>

      <SettingsSection title="Blocked" footer="Blocked people can't see you, message you, or appear in your matches. They aren't notified.">
        {blocked.length === 0 ? (
          <p className="px-4 py-4 text-body-sm text-ink-3">You haven&apos;t blocked anyone.</p>
        ) : (
          blocked.map((person) => (
            <div key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={person.avatarUrl} firstName={person.firstName} lastInitial={person.lastInitial} size={36} />
              <span className="flex-1 text-body-sm font-medium text-ink">
                {person.firstName} {person.lastInitial}.
              </span>
              <Button variant="secondary" size="sm" onClick={() => void unblock(person)}>
                Unblock
              </Button>
            </div>
          ))
        )}
      </SettingsSection>

      <SettingsSection title="Staying safe">
        <ul className="flex flex-col gap-2 px-4 py-4 text-body-sm text-ink-2">
          <li>Meet in public first and tour places together before signing anything.</li>
          <li>Never send deposits, gift cards or payments to someone you haven&apos;t met.</li>
          <li>Report anything that feels off from the ⋯ menu on a profile or chat — reports are confidential.</li>
          <li>
            In an emergency call 911, or {LAUNCH_SCHOOL.police.name} at{" "}
            <a href={`tel:${LAUNCH_SCHOOL.police.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
              {LAUNCH_SCHOOL.police.phone}
            </a>
            .
          </li>
        </ul>
      </SettingsSection>
    </div>
  );
}
