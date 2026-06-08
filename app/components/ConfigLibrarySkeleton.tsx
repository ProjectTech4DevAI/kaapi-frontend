interface ConfigLibrarySkeletonProps {
  columnCount?: number;
  rows?: number;
}

export default function ConfigLibrarySkeleton({
  columnCount = 3,
  rows = 2,
}: ConfigLibrarySkeletonProps) {
  const total = columnCount * rows;
  return (
    <div
      className="grid gap-4 items-start w-full animate-pulse"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-bg-primary p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-40 max-w-full bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-56 max-w-full bg-neutral-100 rounded" />
            </div>
            <div className="w-7 h-7 rounded-md bg-neutral-100 shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 bg-neutral-100 rounded" />
            <div className="h-3 w-16 bg-neutral-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
