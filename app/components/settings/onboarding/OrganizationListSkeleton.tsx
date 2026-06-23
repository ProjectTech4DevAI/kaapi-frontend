export default function OrganizationListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-5 w-36 bg-neutral-200 rounded mb-2" />
          <div className="h-3 w-24 bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-40 bg-neutral-200 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-4 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 max-w-full bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-28 bg-neutral-100 rounded" />
            </div>
            <div className="h-4 w-4 shrink-0 bg-neutral-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
