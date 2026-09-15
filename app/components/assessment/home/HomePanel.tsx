import { ReactNode } from "react";
import { CursorPager, Pager } from "@/app/components/ui";

interface HomePanelProps {
  title: string;
  headerActions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  countLabel: string;
  /** Numbered pages, for a list held entirely in memory. */
  page?: number;
  pages?: number;
  onGoto?: (page: number) => void;
  /** Prev/next only, for a list paged through the API. */
  cursor?: {
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  className?: string;
}

/** Shared shell for Home's two panels: header row, scrolling body, count + pager. */
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
      {/* Fixed height, no wrap: both panels' headers align with each other. */}
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

      {/* Fixed height so both panels' footers line up whether or not a pager shows. */}
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
