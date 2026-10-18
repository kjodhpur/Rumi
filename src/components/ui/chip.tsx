"use client";

import { cn } from "@/lib/utils";

export function Chip({
  selected,
  children,
  onClick,
  className,
}: {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asu-gold",
        selected
          ? "border-asu-maroon bg-asu-maroon text-white"
          : "border-rumi-sand bg-white text-rumi-ink hover:border-asu-maroon/40",
        className,
      )}
    >
      {children}
    </button>
  );
}
