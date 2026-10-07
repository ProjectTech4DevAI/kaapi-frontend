"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import type { CursorPagerProps } from "@/app/lib/types/ui";
import { PAGER_BUTTON_BASE, PAGER_BUTTON_IDLE } from "@/app/lib/constants";

const buttonClass = `${PAGER_BUTTON_BASE} ${PAGER_BUTTON_IDLE}`;

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
        className={buttonClass}
      >
        <ChevronLeftIcon className="w-3 h-3" />
      </button>
      <button
        type="button"
        aria-label="Next page"
        disabled={!hasNext}
        onClick={onNext}
        className={buttonClass}
      >
        <ChevronRightIcon className="w-3 h-3" />
      </button>
    </nav>
  );
}
