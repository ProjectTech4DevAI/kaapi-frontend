"use client";

import { DatabaseIcon } from "@/app/components/icons";
import EvalDatasetDescription from "@/app/components/evaluations/EvalDatasetDescription";
import type { DatasetsListProps } from "@/app/lib/types/assessment";

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">Datasets</h3>
          {isLoadingColumns && (
            <span className="text-xs text-neutral-500">Loading columns...</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
            <p className="text-sm text-neutral-500">Loading datasets...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="p-16 text-center">
            <DatabaseIcon className="mx-auto mb-3 h-12 w-12 text-neutral-200" />
            <p className="mb-1 text-sm font-medium text-neutral-900">
              No datasets yet
            </p>
            <p className="text-xs text-neutral-500">
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
                  className={`cursor-pointer overflow-hidden rounded-lg border-l-[3px] bg-white transition-all ${
                    isSelected
                      ? "border-l-neutral-900 ring-2 ring-neutral-900 shadow-sm"
                      : "border-l-[#DCCFC3] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
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
                          <div className="truncate text-sm font-semibold text-neutral-900">
                            {dataset.dataset_name}
                          </div>
                        </div>
                        {dataset.description && (
                          <EvalDatasetDescription
                            description={dataset.description}
                          />
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                          <span>{dataset.total_items} items</span>
                          {dataset.original_items > 0 &&
                            dataset.original_items !== dataset.total_items && (
                              <>
                                <span className="text-neutral-200">·</span>
                                <span>{dataset.original_items} original</span>
                              </>
                            )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewDataset(
                              dataset.dataset_id,
                              dataset.dataset_name,
                            );
                          }}
                          disabled={viewingId === dataset.dataset_id}
                          className={`rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-900 ${
                            viewingId === dataset.dataset_id ? "opacity-50" : ""
                          }`}
                        >
                          {viewingId === dataset.dataset_id
                            ? "Loading..."
                            : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestDelete(dataset.dataset_id);
                          }}
                          aria-label={`Delete ${dataset.dataset_name}`}
                          className="rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-between border-t border-neutral-200 bg-white px-6 py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="text-xs text-neutral-500">
            {canProceed
              ? "Dataset selected. Continue to AI configuration."
              : "Select a dataset to continue."}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className={`rounded-lg px-5 py-2 text-sm font-medium ${
              canProceed
                ? "cursor-pointer bg-neutral-900 text-white"
                : "cursor-not-allowed bg-neutral-50 text-neutral-500"
            }`}
          >
            Next: AI Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
