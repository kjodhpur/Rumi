"use client";

import { useNow } from "@/hooks/use-hydrated";
import { useIntlLocale } from "@/components/providers/i18n";
import { relative } from "@/lib/time";

/** Relative timestamps render client-side only, so SSR never disagrees with the browser clock. */
export function RelativeTime({
  iso,
  className,
  prefix = "",
}: {
  iso: string;
  className?: string;
  prefix?: string;
}) {
  const now = useNow();
  const intl = useIntlLocale();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {now === null ? " " : `${prefix}${relative(iso, now, intl)}`}
    </time>
  );
}
