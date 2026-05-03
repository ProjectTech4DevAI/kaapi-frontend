"use client";

import { Dataset } from "@/app/lib/types/dataset";
import { Button } from "@/app/components";
import EvalDatasetDescription from "./EvalDatasetDescription";

interface DatasetCardProps {
  dataset: Dataset;
  isViewing: boolean;
  onView: () => void;
  onRequestDelete: () => void;
}

export default function DatasetCard({
  dataset,
  isViewing,
  onView,
  onRequestDelete,
}: DatasetCardProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] border-l-accent-secondary/50">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-text-primary">
              {dataset.dataset_name}
            </div>
            {dataset.description && (
              <EvalDatasetDescription description={dataset.description} />
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
              <span>{dataset.total_items} items</span>
              {dataset.duplication_factor > 1 && (
                <>
                  <span className="text-border">·</span>
                  <span>x{dataset.duplication_factor} duplication</span>
                </>
              )}
              {dataset.original_items > 0 &&
                dataset.original_items !== dataset.total_items && (
                  <>
                    <span className="text-border">·</span>
                    <span>{dataset.original_items} original</span>
                  </>
                )}
            </div>
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
            <Button variant="outline" size="sm" onClick={onRequestDelete}>
              <span className="text-status-error-text">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
