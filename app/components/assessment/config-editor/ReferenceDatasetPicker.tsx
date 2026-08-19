"use client";

import { Loader, Select } from "@/app/components/ui";
import type { Dataset } from "@/app/lib/types/dataset";
import type { ReferenceDataset } from "@/app/hooks/useReferenceDataset";

interface ReferenceDatasetPickerProps {
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  referenceDataset: ReferenceDataset | null;
  isLoadingReference: boolean;
  onSelect: (id: string) => void;
}

// Optional column source for the editor: pick the dataset this config will
// grade so @ offers its real columns. The config is not tied to the dataset.
export default function ReferenceDatasetPicker({
  datasets,
  isLoadingDatasets,
  referenceDataset,
  isLoadingReference,
  onSelect,
}: ReferenceDatasetPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-bg-primary px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">
          Reference dataset
          <span className="ml-2 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
            Optional
          </span>
        </div>
        <div className="mt-0.5 text-xs text-text-secondary">
          Pick the dataset you plan to grade so typing @ suggests its columns.
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isLoadingDatasets ? (
          <Loader size="sm" message="Loading datasets..." />
        ) : (
          <Select
            value={referenceDataset?.id ?? ""}
            placeholder="No dataset selected"
            options={datasets.map((dataset) => ({
              value: dataset.dataset_id.toString(),
              label: dataset.dataset_name,
            }))}
            onChange={(event) => onSelect(event.target.value)}
            className="min-w-[220px]"
          />
        )}
        {isLoadingReference ? (
          <span className="text-xs text-text-secondary">loading columns…</span>
        ) : referenceDataset ? (
          <span className="text-xs text-text-secondary">
            {referenceDataset.headers.length} columns
          </span>
        ) : null}
      </div>
    </div>
  );
}
