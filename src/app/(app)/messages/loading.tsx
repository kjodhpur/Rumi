import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-[760px]" aria-label="Loading messages" aria-busy>
      <Skeleton className="h-9 w-44 lg:h-11" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 flex gap-6 border-b border-line pb-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <ul className="mt-4 flex flex-col gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3.5 py-3">
            <Skeleton className="size-[52px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
