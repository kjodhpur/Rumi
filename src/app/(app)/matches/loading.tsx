import { Skeleton } from "@/components/ui/skeleton";

export default function MatchesLoading() {
  return (
    <div aria-label="Loading matches" aria-busy>
      <div className="pb-6 lg:pb-8">
        <Skeleton className="h-9 w-56 lg:h-11" />
        <Skeleton className="mt-3 h-4 w-72" />
      </div>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:justify-between">
        <Skeleton className="h-11 w-full md:w-[240px]" />
        <Skeleton className="h-11 w-full md:w-[420px]" />
      </div>
      <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <div className="flex flex-col gap-2 px-1 pt-3.5">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-1 h-4 w-4/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
