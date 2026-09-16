"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import { PAGER_WINDOW_SIZE } from "@/app/lib/assessment/constants";
import { pageWindow } from "@/app/lib/utils/assessment";

interface PagerProps {
  page: number;
  pages: number;
  onGoto: (page: number) => void;
  label?: string;
  className?: string;
}

const buttonBase =
  "min-w-7 h-7 px-2 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-35";
const idleStyles =
  "border-border bg-bg-primary text-text-secondary hover:border-accent-muted hover:text-text-primary";
const currentStyles =
  "border-accent-primary bg-accent-primary text-white font-semibold";

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
