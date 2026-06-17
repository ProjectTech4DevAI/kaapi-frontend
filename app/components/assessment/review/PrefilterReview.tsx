"use client";

import type { PrefilterConfig } from "@/app/lib/types/assessment";
import ReviewSection from "./ReviewSection";

interface PrefilterReviewProps {
  prefilterConfig: PrefilterConfig | null;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function ColumnChips({ columns }: { columns: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {columns.map((col) => (
        <span
          key={col}
          className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-neutral-700"
        >
          {col}
        </span>
      ))}
    </div>
  );
}

export default function PrefilterReview({
  prefilterConfig,
  isOpen,
  onToggle,
  onEdit,
}: PrefilterReviewProps) {
  const topicRelevance = prefilterConfig?.topic_relevance;
  const duplicateDetection = prefilterConfig?.duplicate_detection;
  const enabledCount = (topicRelevance ? 1 : 0) + (duplicateDetection ? 1 : 0);
  const isSkipped = enabledCount === 0;

  return (
    <ReviewSection
      title="Eliminatory"
      isOpen={isOpen}
      onToggle={onToggle}
      onEdit={onEdit}
      badge={
        isSkipped
          ? "Skipped"
          : `${enabledCount} filter${enabledCount > 1 ? "s" : ""}`
      }
    >
      <div className="space-y-3 pt-2">
        {isSkipped ? (
          <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
            Skipped — no pre-filters enabled.
          </div>
        ) : (
          <>
            {topicRelevance && (
              <div className="rounded-md bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">
                  Topic Relevance
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-medium text-neutral-500">
                    Columns
                  </div>
                  <ColumnChips columns={topicRelevance.columns} />
                </div>
                {topicRelevance.attachment_columns &&
                  topicRelevance.attachment_columns.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[11px] font-medium text-neutral-500">
                        Documents
                      </div>
                      <ColumnChips
                        columns={topicRelevance.attachment_columns}
                      />
                    </div>
                  )}
                <div className="mt-2">
                  <div className="text-[11px] font-medium text-neutral-500">
                    Prompt
                  </div>
                  <pre
                    className="mt-1 whitespace-pre-wrap font-mono text-xs text-neutral-700"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {topicRelevance.prompt}
                  </pre>
                </div>
              </div>
            )}
            {duplicateDetection && (
              <div className="rounded-md bg-neutral-50 p-3">
                <div className="text-sm font-semibold text-neutral-900">
                  Duplicate Detection
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-medium text-neutral-500">
                    Columns
                  </div>
                  <ColumnChips columns={duplicateDetection.columns} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ReviewSection>
  );
}
