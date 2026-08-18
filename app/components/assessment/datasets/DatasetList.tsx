"use client";

import { DatasetListSkeleton } from "@/app/components";
import { DatabaseIcon } from "@/app/components/icons";
import EvalDatasetDescription from "@/app/components/evaluations/EvalDatasetDescription";
import type { ValueSetter } from "@/app/lib/types/assessment";
import type { Dataset } from "@/app/lib/types/dataset";
import { Button } from "@/app/components/ui";

interface DatasetListProps {
  datasets: Dataset[];
  isLoading: boolean;
  viewingId: number | null;
  onViewDataset: (datasetId: number, name: string) => void;
  onRequestDelete: ValueSetter<number>;
}

export default function DatasetList({
  datasets,
  isLoading,
  viewingId,
  onViewDataset,
  onRequestDelete,
}: DatasetListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            Datasets
          </h3>
          <p className="mt-2 rounded-full border border-accent-secondary bg-accent-secondary/15 px-3 py-2 text-xs font-medium text-text-primary">
            Manage your dataset library. Create a dataset from the form on the
            right; pick one to run when you set up an experiment.
          </p>
        </div>

        {isLoading ? (
          <DatasetListSkeleton count={4} />
        ) : datasets.length === 0 ? (
          <div className="p-16 text-center">
            <DatabaseIcon className="mx-auto mb-3 h-12 w-12 text-border" />
            <p className="mb-1 text-sm font-medium text-text-primary">
              No datasets yet
            </p>
            <p className="text-xs text-text-secondary">
              Create your first dataset using the form on the right
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {datasets.map((dataset) => (
              <div
                key={dataset.dataset_id}
                className="overflow-hidden rounded-lg border-l-[3px] border-l-accent-secondary bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
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
                        onClick={() =>
                          onViewDataset(
                            dataset.dataset_id,
                            dataset.dataset_name,
                          )
                        }
                        disabled={viewingId === dataset.dataset_id}
                        className={` ${
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
                        onClick={() => onRequestDelete(dataset.dataset_id)}
                        aria-label={`Delete ${dataset.dataset_name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
