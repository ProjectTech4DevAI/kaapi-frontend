"use client";

import { useEffect, useState } from "react";
import { STTRun, STTResult } from "@/app/lib/types/speechToText";
import {
  ChevronLeftIcon,
  ClipboardIcon,
  RefreshIcon,
} from "@/app/components/icons";
import { RunsListSkeleton } from "@/app/components";
import STTRunCard from "./STTRunCard";
import STTResultsTable from "./STTResultsTable";

interface STTRunsListProps {
  runs: STTRun[];
  isLoadingRuns: boolean;
  loadRuns: () => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: STTResult[];
  setResults: React.Dispatch<React.SetStateAction<STTResult[]>>;
  isLoadingResults: boolean;
  loadResults: (runId: number) => void;
  onUpdateFeedback: (
    resultId: number,
    isCorrect: boolean | null | undefined,
    comment?: string,
  ) => void;
}

export default function STTRunsList({
  runs,
  isLoadingRuns,
  loadRuns,
  selectedRunId,
  setSelectedRunId,
  results,
  setResults,
  isLoadingResults,
  loadResults,
  onUpdateFeedback,
}: STTRunsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadingRunId, setLoadingRunId] = useState<number | null>(null);

  useEffect(() => {
    setLoadingRunId(null);
  }, [selectedRunId]);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  const filteredRuns =
    statusFilter === "all"
      ? runs
      : runs.filter((r) => r.status.toLowerCase() === statusFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedRunId !== null ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedRunId(null);
                    setLoadingRunId(null);
                  }}
                  className="p-1 rounded text-text-secondary cursor-pointer"
                  aria-label="Back to runs list"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold text-text-primary">
                  {selectedRun?.run_name}
                </h2>
              </div>
            ) : (
              <h2 className="text-base font-semibold text-text-primary">
                Evaluation Runs
              </h2>
            )}
          </div>
          {selectedRunId === null && (
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border appearance-none cursor-pointer pr-7 bg-bg-primary border-border text-text-primary bg-no-repeat bg-position-[right_6px_center] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23737373%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')]"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={loadRuns}
                disabled={isLoadingRuns}
                className="p-1.5 rounded text-text-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh runs"
              >
                <RefreshIcon
                  className={`w-4 h-4 -scale-x-100 ${isLoadingRuns ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="rounded-lg overflow-visible bg-bg-primary shadow-sm">
          {selectedRunId !== null ? (
            <STTResultsTable
              results={results}
              isLoading={isLoadingResults}
              setResults={setResults}
              onUpdateFeedback={onUpdateFeedback}
            />
          ) : isLoadingRuns ? (
            <RunsListSkeleton />
          ) : runs.length === 0 ? (
            <div className="p-16 text-center">
              <ClipboardIcon className="w-12 h-12 mx-auto mb-3 text-border" />
              <p className="text-sm font-medium mb-1 text-text-primary">
                No evaluation runs yet
              </p>
              <p className="text-xs text-text-secondary">
                Run your first evaluation to get started
              </p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm font-medium mb-1 text-text-primary">
                No {statusFilter} runs
              </p>
              <p className="text-xs text-text-secondary">
                No evaluation runs with status &quot;{statusFilter}&quot;
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredRuns.map((run) => (
                <STTRunCard
                  key={run.id}
                  run={run}
                  loadingRunId={loadingRunId}
                  onLoadResults={() => {
                    setLoadingRunId(run.id);
                    loadResults(run.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
