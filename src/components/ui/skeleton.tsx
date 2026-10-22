import { cn } from "@/lib/utils";

/** Shimmer animates a transform on a pseudo-layer — no layout or paint thrash. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-surface-sunken",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent dark:after:via-white/[0.04]",
        className,
      )}
      {...props}
    />
  );
}
