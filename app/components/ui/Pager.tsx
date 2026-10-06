"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import {
  PAGER_BUTTON_BASE,
  PAGER_BUTTON_CURRENT,
  PAGER_BUTTON_IDLE,
  PAGER_WINDOW_SIZE,
} from "@/app/lib/constants";
import { pageWindow } from "@/app/lib/utils/assessment";
import type { PagerProps } from "@/app/lib/types/ui";

const buttonBase = `${PAGER_BUTTON_BASE} px-2`;
const idleStyles = PAGER_BUTTON_IDLE;
const currentStyles = PAGER_BUTTON_CURRENT;

export default function Pager({
  page,
  pages,
  onGoto,
  label = "Pagination",
  className = "",
}: PagerProps) {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label={label}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onGoto(page - 1)}
        className={`${buttonBase} ${idleStyles} px-0`}
      >
        <ChevronLeftIcon className="w-3 h-3" />
      </button>

      {pageWindow(page, pages, PAGER_WINDOW_SIZE).map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-label={`Page ${candidate}`}
          aria-current={candidate === page ? "page" : undefined}
          onClick={() => onGoto(candidate)}
          className={`${buttonBase} ${
            candidate === page ? currentStyles : idleStyles
          }`}
        >
          {candidate}
        </button>
      ))}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onGoto(page + 1)}
        className={`${buttonBase} ${idleStyles} px-0`}
      >
        <ChevronRightIcon className="w-3 h-3" />
      </button>
    </nav>
  );
}
