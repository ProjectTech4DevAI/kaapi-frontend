"use client";

import { TTSRun } from "@/app/lib/types/textToSpeech";
import { Button } from "@/app/components";
import { DatabaseIcon } from "@/app/components/icons";
import { getStatusColor } from "@/app/components/utils";

interface TTSRunCardProps {
  run: TTSRun;
  loadingRunId: number | null;
  onLoadResults: () => void;
}

export default function TTSRunCard({
  run,
  loadingRunId,
  onLoadResults,
}: TTSRunCardProps) {
  const isCompleted = run.status.toLowerCase() === "completed";
  const statusColor = getStatusColor(run.status);
  const isLoading = loadingRunId === run.id;
  const disabled = !isCompleted || loadingRunId !== null;

  return (
    <div
      className={`rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-3 ${statusColor.border}`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-text-primary">
              {run.run_name}
            </div>
            {run.error_message && (
              <div className="mt-2 text-xs wrap-break-word overflow-hidden text-status-error-text">
                {run.error_message}
              </div>
            )}
          </div>
          <span
            className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide shrink-0 ${statusColor.bg} ${statusColor.text}`}
          >
            {run.status}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <DatabaseIcon className="w-3.5 h-3.5 shrink-0" />
              {run.dataset_name}
            </span>
            {run.models && run.models.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-bg-secondary">
                {run.models.join(", ")}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={
              isCompleted && loadingRunId === null ? onLoadResults : undefined
            }
            disabled={disabled}
            className="shrink-0"
          >
            {isLoading && (
              <div className="w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? "Loading..." : "View Results"}
          </Button>
        </div>
      </div>
    </div>
  );
}
