import { Skeleton } from "@/components/ui/skeleton";

/** Header + stacked cards: the shape of most staff pages. */
export function StaffPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-label={label} aria-busy className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-9 w-56 lg:h-10" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

/** Back link, title and a few grouped rows: the settings pages. */
export function SettingsPageSkeleton({ label = "Loading settings" }: { label?: string }) {
  return (
    <div aria-label={label} aria-busy className="mx-auto flex max-w-[680px] flex-col gap-8">
      <div>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Title, tabs and a card list: room home, calendar, check-in, survey. */
export function TabbedPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-label={label} aria-busy className="mx-auto flex max-w-[760px] flex-col gap-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-10 w-72 max-w-full rounded-full" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

/** A centered card: public token pages (match card, family view). */
export function CardPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      aria-busy
      className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center gap-4 px-4"
    >
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  );
}
