"use client";

import ReviewSection from "./ReviewSection";

interface DatasetReviewProps {
  datasetName: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DatasetReview({
  datasetName,
  isOpen,
  onToggle,
}: DatasetReviewProps) {
  return (
    <ReviewSection title="Dataset" isOpen={isOpen} onToggle={onToggle}>
      <div className="pt-2">
        <div className="mb-1 text-xs font-medium text-neutral-500">
          Dataset Name
        </div>
        <div className="text-sm font-medium text-neutral-900">
          {datasetName || "Unknown dataset"}
        </div>
      </div>
    </ReviewSection>
  );
}
