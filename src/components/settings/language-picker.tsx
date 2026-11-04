"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Languages } from "lucide-react";
import { Select } from "@/components/ui/select";
import { setLocale } from "@/app/actions/settings";
import { useLocale, useT } from "@/components/providers/i18n";
import { LOCALE_INFO, SELECTABLE_LOCALES } from "@/lib/i18n/config";

/** Settings → Language. Only complete translations are offered. */
export function LanguagePicker() {
  const t = useT("settings");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
        <Languages className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <label htmlFor="language" className="min-w-0 flex-1 text-body-sm font-medium text-ink">
        {t("language")}
      </label>
      <Select
        id="language"
        className="w-40"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            const result = await setLocale(next);
            if (!result.ok) {
              toast.error(t("languageFailed"));
              return;
            }
            router.refresh();
          });
        }}
      >
        {SELECTABLE_LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_INFO[l].native}
          </option>
        ))}
      </Select>
    </div>
  );
}
