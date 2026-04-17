"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvalJob, AssistantConfig } from "@/app/lib/types/evaluation";
import { getScoreObject } from "@/app/lib/utils/evaluation";
import { getStatusColor } from "@/app/components/utils";
import { timeAgo, formatCostUSD } from "@/app/lib/utils";
import { ConfigModal, InfoTooltip } from "@/app/components";
import ScoreDisplay from "@/app/components/evaluations/ScoreDisplay";
import CostIcon from "@/app/components/icons/evaluations/CostIcon";
import DatabaseIcon from "@/app/components/icons/evaluations/DatabaseIcon";

export interface EvalRunCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

export default function EvalRunCard({
  job,
  assistantConfig,
}: EvalRunCardProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const isCompleted = job.status?.toLowerCase() === "completed";
  const scoreObj = getScoreObject(job);
  const statusColor = getStatusColor(job.status || "");

  return (
    <div
      className={`rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-3 ${statusColor.border}`}
    >
      <div className="px-5 py-4">
        {/* Row 1: Run Name (left) | Status (right) */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-text-primary">
              {job.run_name}
            </div>
            {job.inserted_at && (
              <div className="text-xs mt-0.5 text-text-secondary">
                {timeAgo(job.inserted_at)}
              </div>
            )}
            {/* Error message (if failed) */}
            {job.error_message && (
              <div className="mt-2 text-xs wrap-break-word overflow-hidden text-status-error-text">
                {job.error_message}
              </div>
            )}
          </div>
          <span
            className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide shrink-0 ${statusColor.bg} ${statusColor.text}`}
          >
            {job.status}
          </span>
        </div>

        {/* Row 2: Scores */}
        {scoreObj && (
          <div className="mt-3">
            <ScoreDisplay score={scoreObj} errorMessage={job.error_message} />
          </div>
        )}

        {/* Row 3: Dataset + Config + Cost (left) | Actions (right) */}
        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            {job.dataset_name && (
              <span className="flex items-center gap-1.5">
                <DatabaseIcon className="shrink-0" />
                {job.dataset_name}
              </span>
            )}
            {job.assistant_id && assistantConfig?.name && (
              <span className="px-1.5 py-0.5 rounded bg-bg-secondary">
                {assistantConfig.name}
              </span>
            )}
            {job.cost?.total_cost_usd != null && (
              <span className="flex items-center gap-1.5">
                <CostIcon className="shrink-0" />
                {formatCostUSD(job.cost.total_cost_usd)}
                <InfoTooltip
                  text={
                    <div className="space-y-1">
                      {job.cost.response && (
                        <div className="flex justify-between gap-3">
                          <span>Response generation</span>
                          <span>
                            {formatCostUSD(job.cost.response.cost_usd)}
                          </span>
                        </div>
                      )}
                      {job.cost.embedding && (
                        <div className="flex justify-between gap-3">
                          <span>Cosine similarity calculation</span>
                          <span>
                            {formatCostUSD(job.cost.embedding.cost_usd)}
                          </span>
                        </div>
                      )}
                    </div>
                  }
                />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-transparent text-text-primary"
            >
              View Config
            </button>
            <button
              onClick={() => router.push(`/evaluations/${job.id}`)}
              disabled={!isCompleted}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-transparent cursor-pointer disabled:cursor-not-allowed ${
                isCompleted
                  ? "text-text-primary opacity-100"
                  : "text-text-secondary opacity-50"
              }`}
            >
              View Results
            </button>
          </div>
        </div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />
    </div>
  );
}
