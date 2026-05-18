interface SavedConfigsListSkeletonProps {
  count?: number;
}

export default function SavedConfigsListSkeleton({
  count = 5,
}: SavedConfigsListSkeletonProps) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg p-4 bg-bg-primary shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-48 max-w-full bg-neutral-200 rounded mb-2" />
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="h-5 w-24 rounded-full bg-neutral-200" />
                <div className="h-5 w-14 rounded-full bg-neutral-100" />
                <div className="h-5 w-20 rounded-full bg-neutral-100" />
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-neutral-100 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
