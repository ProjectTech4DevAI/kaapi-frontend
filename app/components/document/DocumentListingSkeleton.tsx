interface DocumentListingSkeletonProps {
  count?: number;
}

export default function DocumentListingSkeleton({
  count = 5,
}: DocumentListingSkeletonProps) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg p-3 bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-md bg-neutral-200 shrink-0" />
                <div className="h-4 w-48 max-w-full bg-neutral-200 rounded" />
              </div>
              <div className="h-3 w-24 bg-neutral-100 rounded ml-9" />
            </div>
            <div className="w-7 h-7 rounded-md bg-neutral-100 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
