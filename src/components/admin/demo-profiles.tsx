"use client";

import * as React from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setSeedProfilesHidden } from "@/app/actions/admin";
import type { SeedSetting } from "@/lib/admin";

/** Per-school switch for the seeded demo profiles. Takes effect on the next page load, no redeploy. */
export function DemoProfiles({ settings }: { settings: SeedSetting[] }) {
  const [hidden, setHidden] = React.useState(() => Object.fromEntries(settings.map((s) => [s.schoolId, s.hidden])));
  if (settings.length === 0) return null;

  async function toggle(setting: SeedSetting, show: boolean) {
    setHidden((h) => ({ ...h, [setting.schoolId]: !show }));
    const result = await setSeedProfilesHidden({ schoolId: setting.schoolId, hidden: !show });
    if (!result.ok) {
      setHidden((h) => ({ ...h, [setting.schoolId]: show }));
      return void toast.error(result.error);
    }
    toast.success(show ? "Demo profiles are visible" : "Demo profiles are hidden", {
      description: show ? undefined : `${setting.schoolName} students now see only real people.`,
    });
  }

  return (
    <section aria-labelledby="demo-profiles-title" className="rounded-lg bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="demo-profiles-title" className="text-body-sm font-semibold text-ink">
            Demo profiles
          </h2>
          <p className="mt-0.5 text-body-sm text-ink-2">
            Seeded profiles make the app feel alive before launch. Hide them once enough real students have joined.
          </p>
        </div>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {settings.map((setting) => {
          const id = `seed-${setting.schoolId}`;
          return (
            <li key={setting.schoolId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <label htmlFor={id} className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink">Show at {setting.schoolName}</span>
                <span className="block text-caption text-ink-3">
                  {setting.seedCount.toLocaleString("en-US")} demo profiles
                </span>
              </label>
              <Switch id={id} checked={!hidden[setting.schoolId]} onCheckedChange={(v) => void toggle(setting, v)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
