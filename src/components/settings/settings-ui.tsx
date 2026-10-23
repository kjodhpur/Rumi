"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SettingsBack({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={className}>
      <Link
        href="/settings"
        className="-ml-2 mb-3 inline-flex h-9 items-center gap-1 rounded-full px-2 text-body-sm font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <ChevronLeft className="size-4" strokeWidth={2} aria-hidden /> Settings
      </Link>
      <h1 className="font-display text-display-md text-ink lg:text-display-lg">{title}</h1>
      {description ? <p className="mt-1.5 text-body-sm text-ink-2 lg:text-body">{description}</p> : null}
    </div>
  );
}

export function SettingsSection({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title ? <h2 className="px-1 text-caption font-semibold tracking-wide text-ink-3 uppercase">{title}</h2> : null}
      <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line">{children}</div>
      {footer ? <p className="px-1 text-caption text-ink-3">{footer}</p> : null}
    </section>
  );
}

export function SettingsLinkRow({
  href,
  icon,
  label,
  detail,
  danger,
  download,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  danger?: boolean;
  download?: boolean;
}) {
  const className = cn(
    "flex min-h-14 items-center gap-3.5 px-4 py-3 outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover",
    danger ? "text-danger" : "text-ink",
  );
  const inner = (
    <>
      {icon ? <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]", danger ? "bg-danger-soft" : "bg-surface-sunken text-ink-2")}>{icon}</span> : null}
      <span className="min-w-0 flex-1 text-body-sm font-medium">{label}</span>
      {detail ? <span className="hidden truncate text-body-sm text-ink-3 sm:block">{detail}</span> : null}
      <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
    </>
  );
  return download ? (
    <a href={href} download className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-body-sm font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-caption text-ink-3">{description}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
