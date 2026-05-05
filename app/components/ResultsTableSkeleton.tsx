interface ResultsTableSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function ResultsTableSkeleton({
  rows = 5,
  cols = 5,
}: ResultsTableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <div className="p-4 space-y-3 animate-pulse min-w-[640px]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="flex-1 h-12 min-w-20 bg-neutral-100 rounded"
                style={{ animationDelay: `${(r + c) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
