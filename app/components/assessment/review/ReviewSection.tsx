"use client";

import { ChevronRightIcon } from "@/app/components/icons";
import type { ReviewSectionProps } from "@/app/lib/types/assessment";

export default function ReviewSection({
  title,
  isOpen,
  onToggle,
  onEdit,
  headerAction,
  badge,
  children,
}: ReviewSectionProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-bg-primary ${
        isOpen ? "border-accent-primary" : "border-border"
      }`}
    >
      <div
        onClick={onToggle}
        className={`flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors ${
          isOpen ? "bg-accent-subtle/15" : "bg-bg-primary"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <ChevronRightIcon
            className={`h-4 w-4 flex-shrink-0 text-text-secondary transition-transform ${
              isOpen ? "rotate-90" : "rotate-0"
            }`}
          />
          <span className="text-sm font-semibold text-text-primary">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="cursor-pointer rounded-md bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-primary transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
  );
}
