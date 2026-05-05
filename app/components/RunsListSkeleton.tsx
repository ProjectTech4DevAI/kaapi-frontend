interface RunsListSkeletonProps {
  count?: number;
}

export default function RunsListSkeleton({ count = 5 }: RunsListSkeletonProps) {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] border-l-neutral-200"
        >
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-52 bg-neutral-200 rounded" />
              </div>
              <div className="h-5 w-20 bg-neutral-100 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-32 bg-neutral-100 rounded" />
                <div className="h-3 w-24 bg-neutral-100 rounded" />
              </div>
              <div className="h-7 w-24 bg-neutral-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
