interface DatasetListSkeletonProps {
  count?: number;
}

export default function DatasetListSkeleton({
  count = 3,
}: DatasetListSkeletonProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] border-l-neutral-200"
        >
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-44 bg-neutral-200 rounded mb-2" />
                <div className="h-3 w-64 bg-neutral-100 rounded mb-3" />
                <div className="flex gap-3">
                  <div className="h-3 w-16 bg-neutral-100 rounded" />
                  <div className="h-3 w-20 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-7 w-14 bg-neutral-100 rounded-lg" />
                <div className="h-7 w-16 bg-neutral-100 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
