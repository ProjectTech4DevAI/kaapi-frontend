interface DatasetListingSkeletonProps {
  count?: number;
}

export default function DatasetListingSkeleton({
  count = 4,
}: DatasetListingSkeletonProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg p-4 bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded bg-neutral-200 shrink-0" />
                <div className="h-5 w-48 max-w-full bg-neutral-200 rounded" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j}>
                    <div className="h-3 w-20 bg-neutral-100 rounded mb-2" />
                    <div className="h-4 w-12 bg-neutral-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-9 h-9 rounded-md bg-neutral-100 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
