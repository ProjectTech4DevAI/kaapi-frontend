"use client";

import { POST_PROCESSING_FILTER_OPS } from "@/app/lib/assessment/constants";
import type { PostProcessingConfig } from "@/app/lib/types/assessment";
import ReviewSection from "./ReviewSection";

interface PostProcessingReviewProps {
  postProcessingConfig: PostProcessingConfig | null;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

const OP_LABELS: Record<string, string> = Object.fromEntries(
  POST_PROCESSING_FILTER_OPS.map((op) => [op.value, op.label]),
);

export default function PostProcessingReview({
  postProcessingConfig,
  isOpen,
  onToggle,
  onEdit,
}: PostProcessingReviewProps) {
  const computed = postProcessingConfig?.computed_columns ?? [];
  const filters = postProcessingConfig?.filter ?? [];
  const sorts = postProcessingConfig?.sort ?? [];
  const ruleCount = computed.length + filters.length + sorts.length;
  const isSkipped = ruleCount === 0;

  return (
    <ReviewSection
      title="Post Processing"
      isOpen={isOpen}
      onToggle={onToggle}
      onEdit={onEdit}
      badge={
        isSkipped ? "Skipped" : `${ruleCount} rule${ruleCount > 1 ? "s" : ""}`
      }
    >
      <div className="space-y-3 pt-2">
        {isSkipped ? (
          <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
            Skipped — no post-processing configured.
          </div>
        ) : (
          <>
            {computed.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-neutral-500">
                  Computed columns
                </div>
                <div className="mt-1 space-y-1">
                  {computed.map((col, i) => (
                    <div key={i} className="font-mono text-xs text-neutral-700">
                      <span className="text-neutral-900">
                        {col.name || "(unnamed)"}
                      </span>
                      <span className="text-neutral-400"> = </span>
                      {col.formula || "(empty)"}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filters.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-neutral-500">
                  Filters
                </div>
                <div className="mt-1 space-y-1">
                  {filters.map((rule, i) => (
                    <div key={i} className="font-mono text-xs text-neutral-700">
                      <span className="text-neutral-900">{rule.column}</span>{" "}
                      {OP_LABELS[rule.op] ?? rule.op}
                      {rule.value !== undefined && rule.value !== ""
                        ? ` ${rule.value}`
                        : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sorts.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-neutral-500">
                  Sort
                </div>
                <div className="mt-1 space-y-1">
                  {sorts.map((rule, i) => (
                    <div key={i} className="font-mono text-xs text-neutral-700">
                      {i + 1}.{" "}
                      <span className="text-neutral-900">{rule.column}</span>{" "}
                      {rule.direction === "asc" ? "↑ Asc" : "↓ Desc"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ReviewSection>
  );
}
