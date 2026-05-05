"use client";

import type { ReviewColumn } from "@/app/lib/types/assessment";
import ReviewSection from "./ReviewSection";

interface ColumnsReviewProps {
  mappedColumns: ReviewColumn[];
  mappedCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export default function ColumnsReview({
  mappedColumns,
  mappedCount,
  isOpen,
  onToggle,
  onEdit,
}: ColumnsReviewProps) {
  return (
    <ReviewSection
      title="Column Mapping"
      isOpen={isOpen}
      onToggle={onToggle}
      onEdit={onEdit}
      badge={`${mappedCount} mapped`}
    >
      <div className="pt-2">
        {mappedColumns.length === 0 ? (
          <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
            No columns mapped.
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            {mappedColumns.map((item) => (
              <div key={item.key} className="font-mono">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${item.badgeClass}`}
                >
                  {item.role}
                </span>
                <span className="text-neutral-500"> - </span>
                <span className="text-neutral-900">{item.column}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReviewSection>
  );
}
