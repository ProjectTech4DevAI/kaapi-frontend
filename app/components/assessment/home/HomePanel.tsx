import { CursorPager, Pager } from "@/app/components/ui";
import type { HomePanelProps } from "@/app/lib/types/assessment";

export default function HomePanel({
  title,
  headerActions,
  banner,
  children,
  countLabel,
  page,
  pages,
  onGoto,
  cursor,
  className = "",
}: HomePanelProps) {
  return (
    <section className={`flex min-h-0 min-w-0 flex-col ${className}`}>
      <div className="flex h-14 shrink-0 items-center gap-2 px-5">
        <h2 className="shrink-0 text-base font-semibold text-text-primary">
          {title}
        </h2>
        {headerActions}
      </div>

      {banner}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4">
        {children}
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-border bg-bg-primary px-5">
        <span className="text-xs text-text-secondary">{countLabel}</span>
        {cursor ? (
          <CursorPager {...cursor} label={`${title} pagination`} />
        ) : (
          <Pager
            page={page ?? 1}
            pages={pages ?? 1}
            onGoto={onGoto ?? (() => {})}
            label={`${title} pagination`}
          />
        )}
      </div>
    </section>
  );
}
