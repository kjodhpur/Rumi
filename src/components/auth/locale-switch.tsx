"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions/settings";
import { useLocale, useT } from "@/components/providers/i18n";
import { LOCALE_INFO, SELECTABLE_LOCALES } from "@/lib/i18n/config";

/** Compact language switch for signed-out screens (saved in a cookie). */
export function LocaleSwitch() {
  const t = useT("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <label className="relative inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-body-sm text-ink-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-focus">
      <Languages className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select
        className="appearance-none bg-transparent pr-1 text-body-sm text-ink outline-none"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
      >
        {SELECTABLE_LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_INFO[l].native}
          </option>
        ))}
      </select>
    </label>
  );
}
