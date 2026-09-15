"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";

interface CursorPagerProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
  className?: string;
}

const buttonBase =
  "min-w-7 h-7 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-35";
const idleStyles =
  "border-border bg-bg-primary text-text-secondary hover:border-accent-muted hover:text-text-primary";

/** Prev/next only — the API reports `has_more`, never a total page count. */
export default function CursorPager({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  label = "Pagination",
  className = "",
}: CursorPagerProps) {
  if (!hasPrev && !hasNext) return null;

  return (
    <nav
      aria-label={label}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={!hasPrev}
        onClick={onPrev}
        className={`${buttonBase} ${idleStyles}`}
      >
        <ChevronLeftIcon className="w-3 h-3" />
      </button>
      <button
        type="button"
        aria-label="Next page"
        disabled={!hasNext}
        onClick={onNext}
        className={`${buttonBase} ${idleStyles}`}
      >
        <ChevronRightIcon className="w-3 h-3" />
      </button>
    </nav>
  );
}
