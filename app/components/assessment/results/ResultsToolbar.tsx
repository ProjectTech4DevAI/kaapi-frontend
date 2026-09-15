"use client";

import { ArrowLeftIcon, DownloadIcon } from "@/app/components/icons";
import { Button, RadioGroup } from "@/app/components/ui";
import type {
  ResultsToolbarProps,
  ResultsViewMode,
} from "@/app/lib/types/assessment";

const VIEW_OPTIONS: { value: ResultsViewMode; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "sheet", label: "Spreadsheet" },
];

export default function ResultsToolbar({
  title,
  subtitle,
  view,
  onViewChange,
  onBack,
  onDownload,
}: ResultsToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-primary px-6 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-text-primary">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <RadioGroup
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
          ariaLabel="Results view"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md!"
          onClick={onBack}
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to runs
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md!"
          onClick={onDownload}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Download CSV
        </Button>
      </div>
    </div>
  );
}
