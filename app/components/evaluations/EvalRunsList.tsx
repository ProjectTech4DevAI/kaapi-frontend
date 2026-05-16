"use client";

import { ClipboardIcon, PlusIcon, RefreshIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui";
import { RunsListSkeleton } from "@/app/components";
import Select from "@/app/components/ui/Select";
import { EvalJob, AssistantConfig } from "@/app/lib/types/evaluation";
import EvalRunCard from "./EvalRunCard";

interface EvalRunsListProps {
  evalJobs: EvalJob[];
  assistantConfigs: Map<string, AssistantConfig>;
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  onRefresh: () => void;
  onCreateNew?: () => void;
}

export default function EvalRunsList({
  evalJobs,
  assistantConfigs,
  isLoading,
  error,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  onCreateNew,
}: EvalRunsListProps) {
  const filteredJobs =
    statusFilter === "all"
      ? evalJobs
      : evalJobs.filter((job) => job.status.toLowerCase() === statusFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text-primary">
            Evaluation Runs
          </h2>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              options={[
                { value: "all", label: "All Status" },
                { value: "completed", label: "Completed" },
                { value: "processing", label: "Processing" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
              ]}
            />
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded text-text-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh evaluations"
            >
              <RefreshIcon
                className={`w-4 h-4 -scale-x-100 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            {onCreateNew && (
              <Button
                variant="primary"
                size="sm"
                onClick={onCreateNew}
                className="lg:hidden"
              >
                <PlusIcon className="w-4 h-4" />
                New
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg overflow-visible bg-bg-primary shadow-sm">
          {isLoading && evalJobs.length === 0 && <RunsListSkeleton />}

          {error && (
            <div className="p-4">
              <div className="rounded-lg p-3 bg-status-error-bg">
                <p className="text-sm text-status-error-text">Error: {error}</p>
              </div>
            </div>
          )}

          {!isLoading && evalJobs.length === 0 && !error && (
            <div className="p-16 text-center">
              <ClipboardIcon className="w-12 h-12 mx-auto mb-3 text-border" />
              <p className="text-sm font-medium mb-1 text-text-primary">
                No evaluation runs yet
              </p>
              <p className="text-xs text-text-secondary">
                Select a dataset and configuration, then run your first
                evaluation
              </p>
            </div>
          )}

          {evalJobs.length > 0 &&
            (filteredJobs.length > 0 ? (
              <div className="p-4 space-y-3">
                {filteredJobs.map((job) => (
                  <EvalRunCard
                    key={job.id}
                    job={job}
                    assistantConfig={
                      job.assistant_id
                        ? assistantConfigs.get(job.assistant_id)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center">
                <p className="text-sm font-medium mb-1 text-text-primary">
                  No {statusFilter} runs
                </p>
                <p className="text-xs text-text-secondary">
                  No evaluation runs with status &quot;{statusFilter}&quot;
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
