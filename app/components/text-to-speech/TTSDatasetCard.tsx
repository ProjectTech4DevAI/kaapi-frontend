"use client";

import { TTSDataset } from "@/app/lib/types/textToSpeech";
import { Button } from "@/app/components/ui";
import TTSDatasetDescription from "@/app/components/text-to-speech/DatasetDescription";

interface TTSDatasetCardProps {
  dataset: TTSDataset;
  isViewing: boolean;
  onView: () => void;
}

export default function TTSDatasetCard({
  dataset,
  isViewing,
  onView,
}: TTSDatasetCardProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] border-l-accent-primary/50">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-text-primary">
              {dataset.name}
            </div>
            {dataset.description && (
              <TTSDatasetDescription description={dataset.description} />
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
