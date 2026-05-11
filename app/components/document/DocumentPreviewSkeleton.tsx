export default function DocumentPreviewSkeleton() {
  return (
    <div className="h-full overflow-hidden bg-neutral-50 animate-pulse">
      <div className="sticky top-0 z-10 bg-bg-primary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-6 h-6 rounded bg-neutral-200 shrink-0" />
              <div className="h-5 w-64 max-w-full bg-neutral-200 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-20 bg-neutral-100 rounded" />
              <div className="h-3 w-32 bg-neutral-100 rounded" />
            </div>
          </div>
          <div className="h-8 w-28 rounded-full bg-neutral-200 shrink-0" />
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="h-[700px] w-full bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
