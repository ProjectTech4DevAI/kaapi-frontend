"use client";

import type { SchemaProperty } from "@/app/lib/types/assessment";

interface SchemaReviewProps {
  outputSchema: SchemaProperty[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}
import ReviewSection from "./ReviewSection";

export default function SchemaReview({
  outputSchema,
  isOpen,
  onToggle,
  onEdit,
}: SchemaReviewProps) {
  return (
    <ReviewSection
      title="Response Format"
      isOpen={isOpen}
      onToggle={onToggle}
      onEdit={onEdit}
      badge={
        outputSchema.length > 0 ? `${outputSchema.length} fields` : "Free text"
      }
    >
      <div className="pt-2">
        {outputSchema.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {outputSchema.map((property) => (
              <span
                key={property.id}
                className="inline-flex items-center gap-1 rounded bg-accent-subtle/30 px-2 py-0.5 font-mono text-xs font-medium text-accent-primary"
              >
                {property.name || "(unnamed)"}
                <span className="font-sans text-[10px] opacity-70">
                  {property.isArray ? `${property.type}[]` : property.type}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-bg-secondary p-3 text-xs text-text-secondary">
            No response format defined — model will return free-form text.
          </div>
        )}
      </div>
    </ReviewSection>
  );
}
