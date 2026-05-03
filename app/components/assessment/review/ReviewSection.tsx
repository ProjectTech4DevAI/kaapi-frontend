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
      className={`overflow-hidden rounded-lg border bg-white ${
        isOpen ? "border-neutral-900" : "border-neutral-200"
      }`}
    >
      <div
        onClick={onToggle}
        className={`flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors ${
          isOpen ? "bg-blue-500/[0.03]" : "bg-white"
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
            className={`h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform ${
              isOpen ? "rotate-90" : "rotate-0"
            }`}
          />
          <span className="text-sm font-semibold text-neutral-900">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
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
              className="cursor-pointer rounded-md bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-900 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-neutral-200 px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
