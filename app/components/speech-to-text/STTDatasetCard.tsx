"use client";

import { Dataset } from "@/app/lib/types/speechToText";
import { Button } from "@/app/components";
import DatasetDescription from "./DatasetDescription";

interface STTDatasetCardProps {
  dataset: Dataset;
  isViewing: boolean;
  onView: () => void;
}

export default function STTDatasetCard({
  dataset,
  isViewing,
  onView,
}: STTDatasetCardProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] border-l-[#DCCFC3]">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-text-primary">
              {dataset.name}
            </div>
            {dataset.description && (
              <DatasetDescription description={dataset.description} />
            )}
            {dataset.dataset_metadata?.sample_count !== undefined && (
              <div className="mt-2 text-xs text-text-secondary">
                {dataset.dataset_metadata.sample_count} samples
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              disabled={isViewing}
            >
              {isViewing ? "Loading..." : "View"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
