import { Skeleton } from "@/components/ui/skeleton";

export function DeviceSkeleton() {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1 sm:gap-0">
        <Skeleton className="h-4 w-32 flex-1" />
        <Skeleton className="h-5 w-16 self-start sm:self-auto" />
      </div>
      <Skeleton className="h-3 w-24 mt-1" />
    </div>
  );
}

export function DeviceSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <DeviceSkeleton key={index} />
      ))}
    </div>
  );
}