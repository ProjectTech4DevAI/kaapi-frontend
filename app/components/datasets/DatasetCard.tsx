"use client";

import { DocumentFileIcon, TrashIcon } from "@/app/components/icons";
import { Dataset } from "@/app/lib/types/dataset";

interface DatasetCardProps {
  dataset: Dataset;
  onDelete: (datasetId: number) => void;
}

export default function DatasetCard({ dataset, onDelete }: DatasetCardProps) {
  return (
    <div className="rounded-lg p-4 bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <DocumentFileIcon className="w-6 h-6 shrink-0 text-text-primary" />
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {dataset.dataset_name}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Stat label="Dataset ID" value={String(dataset.dataset_id)} />
            <Stat label="Total Items" value={String(dataset.total_items)} />
            <Stat
              label="Original Items"
              value={String(dataset.original_items)}
            />
            <Stat
              label="Duplication Factor"
              value={`×${dataset.duplication_factor}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(dataset.dataset_id)}
          className="p-2 rounded-md border border-status-error-border bg-bg-primary text-status-error-text hover:bg-status-error-bg transition-colors shrink-0 cursor-pointer"
          title="Delete Dataset"
          aria-label="Delete Dataset"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase font-semibold mb-1 text-text-secondary">
        {label}
      </div>
      <div className="text-sm font-medium text-text-primary truncate">
        {value}
      </div>
    </div>
  );
}
