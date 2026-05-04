"use client";

import { Button } from "@/app/components";
import Loader from "@/app/components/Loader";
import { DatabaseIcon } from "@/app/components/icons";
import EvalDatasetDescription from "@/app/components/evaluations/EvalDatasetDescription";
import type { ValueSetter } from "@/app/lib/types/assessment";
import type { Dataset } from "@/app/lib/types/datasets";

interface DatasetsListProps {
  datasets: Dataset[];
  datasetId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: number | null;
  canProceed: boolean;
  onSelectDataset: (id: string, name?: string) => void;
  onViewDataset: (datasetId: number, name: string) => void;
  onRequestDelete: ValueSetter<number>;
  onNext: () => void;
}

export default function DatasetList({
  datasets,
  datasetId,
  isLoading,
  isLoadingColumns,
  viewingId,
  canProceed,
  onSelectDataset,
  onViewDataset,
  onRequestDelete,
  onNext,
}: DatasetsListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">
            Datasets
          </h3>
          {isLoadingColumns && (
            <span className="text-xs text-text-secondary">
              Loading columns...
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <Loader size="sm" message="Loading datasets..." />
          </div>
        ) : datasets.length === 0 ? (
          <div className="p-16 text-center">
            <DatabaseIcon className="mx-auto mb-3 h-12 w-12 text-border" />
            <p className="mb-1 text-sm font-medium text-text-primary">
              No datasets yet
            </p>
            <p className="text-xs text-text-secondary">
              Create your first dataset using the form on the left
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {datasets.map((dataset) => {
              const isSelected = datasetId === dataset.dataset_id.toString();
              return (
                <div
                  key={dataset.dataset_id}
                  className={`cursor-pointer overflow-hidden rounded-lg border-l-[3px] bg-bg-primary transition-all ${
                    isSelected
                      ? "border-l-accent-primary ring-1 ring-accent-primary shadow-sm"
                      : "border-l-accent-secondary shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  }`}
                  onClick={() =>
                    onSelectDataset(
                      dataset.dataset_id.toString(),
                      dataset.dataset_name,
                    )
                  }
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-text-primary">
                            {dataset.dataset_name}
                          </div>
                        </div>
                        {dataset.description && (
                          <EvalDatasetDescription
                            description={dataset.description}
                          />
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                          <span>{dataset.total_items} items</span>
                          {dataset.original_items > 0 &&
                            dataset.original_items !== dataset.total_items && (
                              <>
                                <span className="text-border">·</span>
                                <span>{dataset.original_items} original</span>
                              </>
                            )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewDataset(
                              dataset.dataset_id,
                              dataset.dataset_name,
                            );
                          }}
                          disabled={viewingId === dataset.dataset_id}
                          className={`!rounded-lg !px-3 !py-1.5 !text-xs ${
                            viewingId === dataset.dataset_id ? "opacity-50" : ""
                          }`}
                        >
                          {viewingId === dataset.dataset_id
                            ? "Loading..."
                            : "View"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestDelete(dataset.dataset_id);
                          }}
                          aria-label={`Delete ${dataset.dataset_name}`}
                          className="!rounded-lg !px-3 !py-1.5 !text-xs !text-status-error"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-between border-t border-border bg-bg-primary px-6 py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="text-xs text-text-secondary">
            {canProceed
              ? "Dataset selected. Continue to AI configuration."
              : "Select a dataset to continue."}
          </span>
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="!rounded-lg"
          >
            Next: AI Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
