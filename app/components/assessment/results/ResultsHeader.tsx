import { RefreshIcon } from "@/app/components/icons";
import Select from "@/app/components/Select";
import {
  RESULT_SUMMARY_ITEMS,
  SUMMARY_BADGE_CLASSES,
  STATUS_FILTER_OPTIONS,
} from "@/app/lib/assessment/constants";
import type {
  ResultsHeaderProps,
  StatusFilter,
} from "@/app/lib/types/assessment";

export default function ResultsHeader({
  counts,
  statusFilter,
  isLoading,
  onStatusFilterChange,
  onRefresh,
}: ResultsHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg-primary px-6 py-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-text-primary">
          Assessments
        </h2>
        <div className="flex items-center gap-2 ml-2">
          {RESULT_SUMMARY_ITEMS.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${SUMMARY_BADGE_CLASSES[item.tone]}`}
            >
              <span className="font-semibold">{counts[item.key]}</span>
              <span className="text-text-secondary">
                {item.label.toLowerCase()}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          options={STATUS_FILTER_OPTIONS}
          className="w-full cursor-pointer rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none focus:ring-1"
        />

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-white p-2 text-text-secondary transition-colors hover:bg-neutral-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh assessments"
        >
          <RefreshIcon
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
