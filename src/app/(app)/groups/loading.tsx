import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsLoading() {
  return (
    <div aria-label="Loading groups" aria-busy>
      <Skeleton className="h-9 w-40 lg:h-11" />
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-8 h-44 w-full rounded-xl" />
      <div className="mt-10 flex gap-3">
        <Skeleton className="h-56 w-[280px] rounded-lg" />
        <Skeleton className="h-56 w-[280px] rounded-lg" />
      </div>
    </div>
  );
}
