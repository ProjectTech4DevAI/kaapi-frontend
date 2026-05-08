interface CollectionsListSkeletonProps {
  count?: number;
}

export default function CollectionsListSkeleton({
  count = 5,
}: CollectionsListSkeletonProps) {
  return (
    <div className="space-y-1.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg p-3 border border-border bg-bg-primary"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-6 h-6 rounded bg-neutral-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-40 max-w-full bg-neutral-200 rounded mb-1.5" />
              <div className="h-3 w-24 bg-neutral-100 rounded" />
            </div>
            <div className="w-7 h-7 rounded-md bg-neutral-100 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
